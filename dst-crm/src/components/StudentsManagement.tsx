import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../config/firebase";
import "../styles/StudentsManagement.css";
import { updateDoc, doc } from "firebase/firestore";

interface StudentData {
  id: string;
  name?: string;
  surname?: string;
  region?: string;
  school?: string;
  mail?: string;
  telephoneNumber?: string;
  typeOfPayment?: string;
  period?: string;
  amount?: number | string;
  iban?: string;
  note?: string;
  vs?: string; // drž ako string
  createdAt?: Date | null;
}

interface PaymentInfo {
  id: string;
  vs: string;
  amount: number | string;
  date: Date | null;
  message?: string;
  senderIban?: string;
  senderName?: string;
  matchStatus?: "matched" | "unmatched" | "ambiguous";
  matchedStudentId?: string | null;
}



export const StudentsManagement: React.FC = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // 1) Students
      const studentsSnap = await getDocs(collection(db, "students"));
      const studentsList: StudentData[] = studentsSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name ?? "",
          surname: data.surname ?? "",
          region: data.region ?? "",
          school: data.school ?? "",
          mail: data.mail ?? "",
          telephoneNumber: data.telephoneNumber ?? "",
          typeOfPayment: data.typeOfPayment ?? "",
          period: data.period ?? "",
          amount: data.amount ?? "",
          iban: data.iban ?? "",
          note: data.note ?? "",
          vs: data.vs !== undefined && data.vs !== null ? String(data.vs) : "",
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt ?? null,
        };
      });

      // 2) Payments (zoradené podľa date desc)
      const paymentsQ = query(collection(db, "payments"), orderBy("date", "desc"));
      const paymentsSnap = await getDocs(paymentsQ);

      const paymentsList: PaymentInfo[] = paymentsSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          vs: data.vs !== undefined && data.vs !== null ? String(data.vs) : "",
          amount: data.amount ?? 0,
          date: data.date?.toDate ? data.date.toDate() : data.date ?? null,
          message: data.message ?? "",
          senderIban: data.senderIban ?? "",
          senderName: data.senderName ?? "",
          matchStatus: data.matchStatus ?? (data.matchedStudentId ? "matched" : "unmatched"),
          matchedStudentId: data.matchedStudentId ?? null,
        };
      });

      // Sort students (podľa priezviska, mena)
      studentsList.sort((a, b) => {
        const as = `${a.surname ?? ""} ${a.name ?? ""}`.toLowerCase();
        const bs = `${b.surname ?? ""} ${b.name ?? ""}`.toLowerCase();
        return as.localeCompare(bs);
      });

      setStudents(studentsList);
      setPayments(paymentsList);
    } catch (err) {
      console.error("Chyba pri načítaní študentov/platieb:", err);
      setMessage("Chyba pri načítaní študentov/platieb");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };


  const assignPaymentToStudent = async (paymentId: string, studentId: string) => {
  try {
    await updateDoc(doc(db, "payments", paymentId), {
      matchedStudentId: studentId,
      matchStatus: "matched",
    });

    loadAll(); // refresh dát
  } catch (err) {
    console.error("Chyba pri párovaní:", err);
  }
};
  // Map: vs -> payments[]
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

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;

    return students.filter((s) => {
      const blob = `${s.name ?? ""} ${s.surname ?? ""} ${s.mail ?? ""} ${s.school ?? ""} ${s.vs ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [students, search]);

  const toggleExpanded = (studentId: string) => {
    setExpanded((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  if (loading) {
    return <div className="students-management-container">Načítavam študentov...</div>;
  }

  return (
    <div className="students-management-container">
      <div className="students-management-header">
        <h2>Správa študentov</h2>
        <p>Prehľad všetkých študentov a ich platieb</p>
      </div>

      {message && <div className={`message message-${messageType}`}>{message}</div>}

      <div className="students-card">
        <div className="students-toolbar">
          <input
            className="students-search"
            placeholder="Hľadať (meno, priezvisko, mail, škola, VS)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="students-count">
            Zobrazené: <b>{filteredStudents.length}</b> / {students.length}
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <p className="empty-message">Žiadni študenti pre dané hľadanie</p>
        ) : (
          <div className="students-table-wrapper">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Meno</th>
                  <th>Mail</th>
                  <th>Škola</th>
                  <th>Región</th>
                  <th>VS</th>
                  <th>Platby</th>
                  <th>Akcia</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => {
                  const vsKey = (s.vs ?? "").trim();
                  const studentPayments = vsKey ? paymentsByVS.get(vsKey) ?? [] : [];
                  const isOpen = !!expanded[s.id];

                  return (
                    <React.Fragment key={s.id}>
                      <tr>
                        <td className="name-cell">
                          <div className="name-strong">{(s.name ?? "") + " " + (s.surname ?? "")}</div>
                          <div className="name-sub">{s.telephoneNumber ?? ""}</div>
                        </td>
                        <td>{s.mail || "-"}</td>
                        <td>{s.school || "-"}</td>
                        <td>{s.region || "-"}</td>
                        <td className="vs-cell">{s.vs || "-"}</td>
                        <td>
                          <span className="payments-pill">{studentPayments.length}</span>
                        </td>
                        <td>
                          <button
                            className="btn"
                            onClick={() => toggleExpanded(s.id)}
                            disabled={!s.vs}
                            title={!s.vs ? "Študent nemá VS" : ""}
                          >
                            {isOpen ? "Skryť platby" : "Zobraziť platby"}
                          </button>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="payments-row">
                          <td colSpan={7}>
                            {studentPayments.length === 0 ? (
                              <div className="payments-empty">
                                Žiadne platby pre VS: <b>{s.vs}</b>
                              </div>
                            ) : (
                              <div className="payments-inner">
                                <table className="payments-mini-table">
                                  <thead>
                                    <tr>
                                      <th>Dátum</th>
                                      <th>Suma</th>
                                      <th>Odosielateľ</th>
                                      <th>Správa</th>
                                      <th>Stav</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {studentPayments.map((p) => {
                                        const isMatchedToThisStudent = p.matchedStudentId === s.id;

                                        return (
                                            <tr key={p.id}>
                                            <td>{p.date ? new Date(p.date).toLocaleString("sk-SK") : "-"}</td>
                                            <td>{typeof p.amount === "number" ? p.amount : String(p.amount)}</td>
                                            <td>{p.senderName || p.senderIban || "-"}</td>
                                            <td className="message-cell">{p.message || "-"}</td>

                                            <td>
                                                <span className={`status-badge ${isMatchedToThisStudent ? "matched" : "unmatched"}`}>
                                                {isMatchedToThisStudent ? "Priradené" : "Nepriradené"}
                                                </span>

                                                {!isMatchedToThisStudent && (
                                                <button
                                                    className="btn-small"
                                                    onClick={() => assignPaymentToStudent(p.id, s.id)}
                                                >
                                                    Spárovať
                                                </button>
                                                )}
                                            </td>
                                            </tr>
                                        );
                                        })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsManagement;
