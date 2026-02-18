import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import "../styles/Communication.css";

interface StudentData {
  id: string;
  name?: string;
  surname?: string;
  mail?: string;
  school?: string;
  vs?: string; // string!
  amount?: number | string; // základná suma (v eurách)
  period?: string; // "Year" | "Half-year" | "Month"
}

interface PaymentInfo {
  id: string;
  vs: string;
  amount: number | string;
  date?: Date | null;
  message?: string;
  senderName?: string;
  senderIban?: string;
  matchedStudentId?: string | null;
  matchStatus?: "matched" | "unmatched" | "ambiguous";
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const Communication: React.FC = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // číslo 1..10 ktoré používateľ zadá
  const [installmentIndex, setInstallmentIndex] = useState<number>(1);

  // možnosť prepísať očakávanú sumu lokálne pre študenta: map studentId -> overrideNumber
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  // FILTER TERAZ PODĽA VYPOČÍTANÉHO STAVU: "all" | "paid" | "partial" | "unpaid" | "overpaid"
  const [statusFilter, setStatusFilter] = useState<
    "all" | "paid" | "partial" | "unpaid" | "overpaid"
  >("all");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // načítaj študentov
      const studentsSnap = await getDocs(collection(db, "students"));
      const studentsList: StudentData[] = studentsSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name ?? "",
          surname: data.surname ?? "",
          mail: data.mail ?? "",
          school: data.school ?? "",
          period: data.period ?? "",
          // dôležité: vs ako string
          vs: data.vs !== undefined && data.vs !== null ? String(data.vs) : "",
          // amount predpokladáme že je v eurách (číslo)
          amount:
            typeof data.amount === "number" ? data.amount : data.amount ? Number(data.amount) : 0,
        };
      });

      // načítaj platby (zoradené podľa date)
      const paymentsQ = query(collection(db, "payments"), orderBy("date", "desc"));
      const paymentsSnap = await getDocs(paymentsQ);
      const paymentsList: PaymentInfo[] = paymentsSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          vs: data.vs !== undefined && data.vs !== null ? String(data.vs) : "",
          amount:
            typeof data.amount === "number" ? data.amount : data.amount ? Number(data.amount) : 0,
          date: data.date?.toDate ? data.date.toDate() : data.date ?? null,
          message: data.message ?? "",
          senderName: data.senderName ?? "",
          senderIban: data.senderIban ?? "",
          matchedStudentId: data.matchedStudentId ?? null,
          matchStatus: data.matchStatus ?? (data.matchedStudentId ? "matched" : "unmatched"),
        };
      });

      // zorad podľa priezviska
      studentsList.sort((a, b) => {
        const as = ((a.surname ?? "") + " " + (a.name ?? "")).toLowerCase();
        const bs = ((b.surname ?? "") + " " + (b.name ?? "")).toLowerCase();
        return as.localeCompare(bs);
      });

      setStudents(studentsList);
      setPayments(paymentsList);
    } catch (err) {
      console.error("Chyba pri načítaní:", err);
      setMessage("Chyba pri načítaní dát");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // mapovanie VS -> platby
  const paymentsByVS = useMemo(() => {
    const map = new Map<string, PaymentInfo[]>();
    for (const p of payments) {
      const key = (p.vs ?? "").trim();
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [payments]);

  // pomocná: prečíta "base" amount (override alebo zo študenta)
  const baseAmount = (s: StudentData) => {
    const o = overrides[s.id];
    if (o !== undefined) return o;
    const v = s.amount ?? 0;
    return typeof v === "number" ? v : Number(v ?? 0);
  };

  // očakávaná suma podľa pravidiel
  const expectedForStudent = (s: StudentData) => {
    const base = baseAmount(s);
    const period = (s.period ?? "").toString().toLowerCase();
    const idx = clamp(installmentIndex || 1, 1, 10);

    if (period === "year") return base * 1;
    if (period === "half-year" || period === "halfyear" || period === "half year") {
      if (idx >= 1 && idx <= 5) return base * 1;
      return base * 2;
    }
    if (period === "month" || period === "monthly") return base * idx;

    return base * idx;
  };

  // zaplatené (sum všetkých platieb pre VS)
  const paidForStudent = (s: StudentData) => {
    const vs = (s.vs ?? "").trim();
    if (!vs) return 0;
    const arr = paymentsByVS.get(vs) ?? [];
    return arr.reduce((acc, p) => {
      const v = typeof p.amount === "number" ? p.amount : Number(p.amount ?? 0);
      return acc + (isNaN(v) ? 0 : v);
    }, 0);
  };

  // status (paid/partial/unpaid/overpaid) podľa expected vs paid
  const statusForStudent = (s: StudentData) => {
    const expected = expectedForStudent(s);
    const paid = paidForStudent(s);

    if (expected > 0 && paid === expected) return "paid";
    if (paid > expected) return "overpaid";
    if (paid >= 0 && paid < expected) return "partial";
    return "unpaid";
  };

  // filtered students teraz podľa vypočítaného statusFilter
  const filteredStudents = useMemo(() => {
    if (statusFilter === "all") return students;
    return students.filter((s) => {
      const st = statusForStudent(s);
      return st === statusFilter;
    });
  }, [students, statusFilter, paymentsByVS, installmentIndex, overrides]);

  // override handler (lokálne)
  const setOverrideForStudent = (studentId: string, value: number) => {
    setOverrides((prev) => ({ ...prev, [studentId]: value }));
  };

  const saveOverrideToStudent = async (studentId: string) => {
    const val = overrides[studentId];
    if (val === undefined) {
      setMessage("Nie je nastavená žiadna hodnota na uloženie.");
      setMessageType("error");
      return;
    }
    try {
      await updateDoc(doc(db, "students", studentId), { amount: val });
      setMessage("Očakávaná suma uložená pre študenta.");
      setMessageType("success");
      loadAll();
    } catch (err) {
      console.error(err);
      setMessage("Chyba pri ukladaní.");
      setMessageType("error");
    }
  };

  if (loading) {
    return <div className="installments-check-container">Načítavam dáta...</div>;
  }

  return (
    <div className="installments-check-container">
      <div className="header">
        <h2>Kontrola splátok</h2>
        <p>Vyber číslo 1–10 (poradie / počet splátok) a skontroluj očakávané vs. zaplatené sumy</p>
      </div>

      {message && <div className={`message message-${messageType}`}>{message}</div>}

      <div className="controls">
        <label>
          Poradie / počet splátok (1–10):
          <input
            type="number"
            min={1}
            max={10}
            value={installmentIndex}
            onChange={(e) => setInstallmentIndex(clamp(Number(e.target.value) || 1, 1, 10))}
          />
        </label>

        {/* FILTER PODĽA VYPOČÍTANÉHO STAVU */}
        <label style={{ marginLeft: 12 }}>
          Filter podľa stavu:
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ marginLeft: 8, padding: "6px 8px", borderRadius: 6 }}
          >
            <option value="all">Všetky</option>
            <option value="paid">Plne</option>
            <option value="partial">Čiastočne</option>
            <option value="unpaid">Nezaplatené</option>
            <option value="overpaid">Nadvyše</option>
          </select>
        </label>

        <button style={{ marginLeft: 12 }} onClick={loadAll}>
          Obnoviť dáta
        </button>
      </div>

      <div className="table-wrapper">
        <table className="installments-table">
          <thead>
            <tr>
              <th>Študent</th>
              <th>VS</th>
              <th>Period</th>
              <th>Očakávané</th>
              <th>Zaplatené</th>
              <th>Rozdiel</th>
              <th>Stav</th>
              <th>Upraviť očakávané</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => {
              const expected = expectedForStudent(s);
              const paid = paidForStudent(s);
              const diff = expected - paid;
              const status = statusForStudent(s);
              return (
                <tr key={s.id} className={`row-${status}`}>
                  <td>
                    <div className="student-name">{(s.name ?? "") + " " + (s.surname ?? "")}</div>
                    <div className="student-mail">{s.mail}</div>
                  </td>
                  <td className="vs-cell">{s.vs || "-"}</td>
                  <td>{s.period || "-"}</td>
                  <td>{expected}</td>
                  <td>{paid}</td>
                  <td className={`diff ${diff > 0 ? "positive" : diff < 0 ? "negative" : "zero"}`}>
                    {diff}
                  </td>
                  <td>
                    <span className={`status-badge ${status}`}>
                      {status === "paid"
                        ? "Plne"
                        : status === "partial"
                        ? "Čiastočne"
                        : status === "unpaid"
                        ? "Nezaplatené"
                        : "Nadvyše"}
                    </span>
                  </td>
                  <td>
                    <div className="override-row">
                      <input
                        type="number"
                        step="1"
                        value={overrides[s.id] ?? (typeof s.amount === "number" ? s.amount : Number(s.amount ?? 0))}
                        onChange={(e) => setOverrideForStudent(s.id, Number(e.target.value || 0))}
                        title="Prepíše základnú očakávanú sumu (per installment)"
                      />
                      <button onClick={() => saveOverrideToStudent(s.id)}>Uložiť</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 16 }}>
                  Žiadni študenti pre aktuálny filter stavu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      

    <style jsx>{`
        .controls { display:flex; gap:12px; align-items:center; margin-bottom:12px; }
        .installments-table { width:100%; border-collapse:collapse; }
        .installments-table th, .installments-table td { padding:8px; border:1px solid #e6e6e6; text-align:left; vertical-align:middle; }
        .row-paid { background:#e8f7e8; }      
        .row-partial { background:#fff7e0; }  
        .row-unpaid { background:#fff5f5; }    
        .row-overpaid { background:#e8f0ff; }  
        .status-badge.paid { color: #0b7a0b; font-weight:600; }
        .status-badge.partial { color: #a06b00; font-weight:600; }
        .status-badge.unpaid { color: #a10000; font-weight:600; }
        .status-badge.overpaid { color: #0b47a6; font-weight:600; }
        .diff.positive { color: #a10000; } 
        .diff.zero { color: #1f7a1f; }
      `}</style>
      
    
    </div>
  );
};

export default Communication;
