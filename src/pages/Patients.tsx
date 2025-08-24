import React, { useState, useRef, useEffect } from "react";
import { PatientService } from "../services/patientService";
import { exportToCSV, parseCSV } from "../lib/csvUtils";
import Toast from "../components/Toast";

// Define the Patient interface
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  birthNumber: string;
  dateOfBirth: Date | null;
  gender: string;
  phone: string | null;
  email: string | null;
  insurance: string | null;
  insuranceCode: string | null;
  address: string | null;
  city: string | null;
  employerOrSchool: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
}

interface PaginationResult {
  data: Patient[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

const Patients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    birthNumber: "",
    dateOfBirth: "",
    gender: "M",
    phone: "",
    email: "",
    insurance: "",
    insuranceCode: "",
    address: "",
    city: "",
    employerOrSchool: "",
    notes: "",
  });

  const [toast, setToast] = useState<
    | {
        type: "success" | "error";
        message: string;
      }
    | null
  >(null);
  const pageSize = 10;

  useEffect(() => {
    loadPatients();
  }, [page, searchTerm]);

  const loadPatients = async () => {
    try {
      setIsLoading(true);
      // Call the service with positional params (service signature: getPatients(page, pageSize))
      const result = await PatientService.getPatients(page, pageSize);

      // Update the state with the fetched data
      setPatients(result.data);
      setTotalPages(Math.ceil(result.pagination.total / pageSize));
    } catch (error) {
      console.error("Error loading patients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    loadPatients();
  };

  const handleExport = async () => {
    try {
      await PatientService.exportPatientsToCSV();
    } catch (error) {
      console.error("Error exporting patients:", error);
    }
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    setImportStatus(null);
    setImportFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportStatus({
        success: false,
        message: "Vyberte prosím soubor k importu.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const result = await PatientService.importPatientsFromCSV(importFile);
      setImportStatus({
        success: true,
        message: `Úspěšně importováno ${result.length} pacientů.`,
      });
      loadPatients();
      setTimeout(() => {
        setShowImportModal(false);
        setImportStatus(null);
      }, 2000);
    } catch (error) {
      console.error("Error importing patients:", error);
      setImportStatus({
        success: false,
        message:
          "Při importu došlo k chybě. Zkontrolujte formát souboru a zkuste to znovu.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return "";
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("cs-CZ");
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pacienti
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Seznam všech registrovaných pacientů
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleImportClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Importovat CSV
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Exportovat CSV
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Nový pacient
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : patients.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Žádní pacienti
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Zatím nemáte žádné pacienty. Začněte přidáním prvého pacienta.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowNewModal(true)}
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 01-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Nový pacient
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Jméno
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Rodné číslo
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Kontakt
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Pojišťovna
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Akce</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-300 font-medium">
                            {patient.firstName?.[0]}
                            {patient.lastName?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {patient.firstName} {patient.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(patient.dateOfBirth)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {patient.birthNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {patient.phone || "-"}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {patient.email || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {patient.insurance || "-"}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {patient.insuranceCode || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4">
                        Upravit
                      </button>
                      <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        Smazat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                  page === 1
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                Předchozí
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                  page >= totalPages
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                Další
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Zobrazeno{" "}
                  <span className="font-medium">
                    {(page - 1) * pageSize + 1}
                  </span>{" "}
                  až{" "}
                  <span className="font-medium">
                    {Math.min(page * pageSize, patients.length)}
                  </span>{" "}
                  z <span className="font-medium">{patients.length}</span>{" "}
                  výsledků
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border ${
                      page === 1
                        ? "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="sr-only">Předchozí</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border ${
                          page === pageNum
                            ? "z-10 bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-300"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        } text-sm font-medium`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border ${
                      page >= totalPages
                        ? "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="sr-only">Další</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Patient Modal */}
      {showNewModal && (
        <div className="fixed z-20 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Nový pacient
              </h3>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300">
                      Jméno
                    </label>
                    <input
                      value={newPatient.firstName}
                      onChange={(e) =>
                        setNewPatient((p) => ({
                          ...p,
                          firstName: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300">
                      Příjmení
                    </label>
                    <input
                      value={newPatient.lastName}
                      onChange={(e) =>
                        setNewPatient((p) => ({
                          ...p,
                          lastName: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300">
                      Rodné číslo
                    </label>
                    <input
                      value={newPatient.birthNumber}
                      onChange={(e) =>
                        setNewPatient((p) => ({
                          ...p,
                          birthNumber: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300">
                      Datum narození
                    </label>
                    <input
                      type="date"
                      value={newPatient.dateOfBirth}
                      onChange={(e) =>
                        setNewPatient((p) => ({
                          ...p,
                          dateOfBirth: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300">
                      Pohlaví
                    </label>
                    <select
                      value={newPatient.gender}
                      onChange={(e) =>
                        setNewPatient((p) => ({ ...p, gender: e.target.value }))
                      }
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="M">Muž</option>
                      <option value="F">Žena</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300">
                      Telefon
                    </label>
                    <input
                      value={newPatient.phone}
                      onChange={(e) =>
                        setNewPatient((p) => ({ ...p, phone: e.target.value }))
                      }
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newPatient.email}
                    onChange={(e) =>
                      setNewPatient((p) => ({ ...p, email: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300">
                      Pojišťovna
                    </label>
                    <input
                      value={newPatient.insurance}
                      onChange={(e) =>
                        setNewPatient((p) => ({
                          ...p,
                          insurance: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300">
                      Kód pojišťovny
                    </label>
                    <input
                      value={newPatient.insuranceCode}
                      onChange={(e) =>
                        setNewPatient((p) => ({
                          ...p,
                          insuranceCode: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300">
                    Adresa
                  </label>
                  <input
                    value={newPatient.address}
                    onChange={(e) =>
                      setNewPatient((p) => ({ ...p, address: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300">
                      Město
                    </label>
                    <input
                      value={newPatient.city}
                      onChange={(e) =>
                        setNewPatient((p) => ({ ...p, city: e.target.value }))
                      }
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300">
                      Zaměstnání/Škola
                    </label>
                    <input
                      value={newPatient.employerOrSchool}
                      onChange={(e) =>
                        setNewPatient((p) => ({
                          ...p,
                          employerOrSchool: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300">
                    Poznámky
                  </label>
                  <textarea
                    value={newPatient.notes}
                    onChange={(e) =>
                      setNewPatient((p) => ({ ...p, notes: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !newPatient.firstName ||
                      !newPatient.lastName ||
                      !newPatient.birthNumber
                    ) {
                      setToast({
                        type: "error",
                        message:
                          "Vyplňte prosím Jméno, Příjmení a Rodné číslo.",
                      });
                      return;
                    }
                    try {
                      setIsLoading(true);
                      await PatientService.createPatient({
                        firstName: newPatient.firstName,
                        lastName: newPatient.lastName,
                        birthNumber: newPatient.birthNumber,
                        dateOfBirth: newPatient.dateOfBirth
                          ? new Date(newPatient.dateOfBirth)
                          : null,
                        gender: newPatient.gender,
                        phone: newPatient.phone || undefined,
                        email: newPatient.email || undefined,
                        insurance: newPatient.insurance || undefined,
                        insuranceCode: newPatient.insuranceCode || undefined,
                        address: newPatient.address || undefined,
                        city: newPatient.city || undefined,
                        employerOrSchool:
                          newPatient.employerOrSchool || undefined,
                        notes: newPatient.notes || undefined,
                      });
                      setShowNewModal(false);
                      setNewPatient({
                        firstName: "",
                        lastName: "",
                        birthNumber: "",
                        dateOfBirth: "",
                        gender: "M",
                        phone: "",
                        email: "",
                        insurance: "",
                        insuranceCode: "",
                        address: "",
                        city: "",
                        employerOrSchool: "",
                        notes: "",
                      });
                      await loadPatients();
                      setToast({
                        type: "success",
                        message: "Pacient byl úspěšně vytvořen.",
                      });
                    } catch (err) {
                      console.error("Error creating patient", err);
                      setToast({
                        type: "error",
                        message: "Nepodařilo se vytvořit pacienta.",
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:text-sm bg-green-600 hover:bg-green-700"
                >
                  Uložit
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Zrušit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <svg
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Import pacientů
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Nahrajte soubor CSV s daty pacientů. Ujistěte se, že
                      soubor je ve správném formátu.
                    </p>
                    {importStatus && (
                      <div
                        className={`mt-4 p-3 rounded-md ${
                          importStatus.success
                            ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                            : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                        }`}
                      >
                        {importStatus.message}
                      </div>
                    )}
                    <div className="mt-4">
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>Nahrát soubor</span>
                              <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                className="sr-only"
                                accept=".csv"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                              />
                            </label>
                            <p className="pl-1">nebo přetáhněte sem</p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            CSV do 10MB
                          </p>
                        </div>
                      </div>
                      {importFile && (
                        <div className="mt-2 text-sm text-gray-900 dark:text-gray-200">
                          Vybraný soubor: {importFile.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!importFile || isLoading}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:text-sm ${
                    !importFile || isLoading
                      ? "bg-blue-400 dark:bg-blue-700 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isLoading ? "Importuji..." : "Importovat"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportStatus(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Zrušit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
