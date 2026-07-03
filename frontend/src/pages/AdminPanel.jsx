import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import TestCaseManager from "../components/TestCaseManager";

const AdminPanel = () => {
  const [syncing, setSyncing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [selectedProblems, setSelectedProblems] = useState([]);

  // Test Case Manager states
  const [showTestCaseManager, setShowTestCaseManager] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  // Fetch all problems
  const fetchProblems = async () => {
    setLoadingProblems(true);
    try {
      const response = await api.get("/problems");
      setProblems(response.data.problems || []);
    } catch (error) {
      console.error("Error fetching problems:", error);
      toast.error("Failed to load problems");
    } finally {
      setLoadingProblems(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  // Filter problems based on search and difficulty
  const filteredProblems = problems.filter((problem) => {
    const matchesSearch =
      problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.problemId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty =
      difficultyFilter === "All" || problem.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProblems = filteredProblems.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, difficultyFilter]);

  // Delete a single problem
  const handleDeleteProblem = async (problemId, title) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${title}"?\n\nThis action cannot be undone!`,
      )
    ) {
      return;
    }

    setDeleting(problemId);
    try {
      const response = await api.delete(`/problems/${problemId}`);
      toast.success(response.data.message);
      setProblems(problems.filter((p) => p.problemId !== problemId));
      setSelectedProblems(selectedProblems.filter((id) => id !== problemId));
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.response?.data?.error || "Failed to delete problem");
    } finally {
      setDeleting(null);
    }
  };

  // Delete multiple problems
  const handleDeleteSelected = async () => {
    if (selectedProblems.length === 0) {
      toast.error("No problems selected");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedProblems.length} problem(s)?\n\nThis action cannot be undone!`,
      )
    ) {
      return;
    }

    try {
      const response = await api.post("/problems/delete-batch", {
        problemIds: selectedProblems,
      });
      toast.success(response.data.message);
      setProblems(
        problems.filter((p) => !selectedProblems.includes(p.problemId)),
      );
      setSelectedProblems([]);
    } catch (error) {
      console.error("Batch delete error:", error);
      toast.error(error.response?.data?.error || "Failed to delete problems");
    }
  };

  // Toggle selection
  const toggleSelect = (problemId) => {
    if (selectedProblems.includes(problemId)) {
      setSelectedProblems(selectedProblems.filter((id) => id !== problemId));
    } else {
      setSelectedProblems([...selectedProblems, problemId]);
    }
  };

  // Select all on current page
  const selectAllOnPage = () => {
    const currentPageIds = currentProblems.map((p) => p.problemId);
    const allSelected = currentPageIds.every((id) =>
      selectedProblems.includes(id),
    );

    if (allSelected) {
      setSelectedProblems(
        selectedProblems.filter((id) => !currentPageIds.includes(id)),
      );
    } else {
      const newSelected = [...selectedProblems];
      currentPageIds.forEach((id) => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      setSelectedProblems(newSelected);
    }
  };

  // Select all problems
  const selectAllProblems = () => {
    if (selectedProblems.length === filteredProblems.length) {
      setSelectedProblems([]);
    } else {
      setSelectedProblems(filteredProblems.map((p) => p.problemId));
    }
  };

  // Sync problems from Google Sheets
  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await api.post("/problems/sync-google-sheets");
      toast.success(response.data.message);
      setTimeout(() => {
        fetchProblems();
      }, 2000);
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(error.response?.data?.error || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Preview problems from Google Sheets
  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const response = await api.get("/problems/preview-google-sheets");
      setPreview(response.data);
      toast.success(`Found ${response.data.count} problems in Google Sheets`);
    } catch (error) {
      console.error("Preview error:", error);
      toast.error(error.response?.data?.error || "Preview failed");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle Excel file upload
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (
      selectedFile &&
      (selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selectedFile.name.endsWith(".xlsx"))
    ) {
      setFile(selectedFile);
      toast.success("File selected successfully");
    } else {
      toast.error("Please select a valid Excel file (.xlsx)");
      e.target.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.post("/problems/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setFile(null);
        document.getElementById("file-input").value = "";
        fetchProblems();
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/problems/template/download", {
        responseType: "blob",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "problems_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Template downloaded successfully");
    } catch (error) {
      toast.error("Failed to download template");
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Easy":
        return "#10b981";
      case "Medium":
        return "#f59e0b";
      case "Hard":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  // Pagination handler
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>⚙️ Admin Panel</h1>
        <p style={styles.headerSubtitle}>
          Manage problems and sync with Google Sheets
        </p>
      </div>

      {/* Problems List Section */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardIcon}>📋</span>
          <h2 style={styles.cardTitle}>Manage Problems</h2>
          <span style={styles.problemCount}>
            {filteredProblems.length} total problems
          </span>
        </div>

        {/* Search and Filter Bar */}
        <div style={styles.filterBar}>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by title or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={styles.perPageSelect}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>

        {/* Bulk Actions */}
        <div style={styles.bulkActions}>
          <div style={styles.bulkLeft}>
            <label style={styles.selectAllLabel}>
              <input
                type="checkbox"
                checked={
                  selectedProblems.length === filteredProblems.length &&
                  filteredProblems.length > 0
                }
                onChange={selectAllProblems}
                style={styles.checkbox}
              />
              Select All ({filteredProblems.length} problems)
            </label>
            <button onClick={selectAllOnPage} style={styles.selectPageButton}>
              Select Current Page ({currentProblems.length})
            </button>
          </div>
          {selectedProblems.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              style={styles.deleteSelectedButton}
            >
              🗑️ Delete Selected ({selectedProblems.length})
            </button>
          )}
        </div>

        {/* Problems Table */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={
                      currentProblems.length > 0 &&
                      currentProblems.every((p) =>
                        selectedProblems.includes(p.problemId),
                      )
                    }
                    onChange={selectAllOnPage}
                    style={styles.checkbox}
                  />
                </th>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Difficulty</th>
                <th style={styles.th}>Submissions</th>
                <th style={styles.th}>Acceptance</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingProblems ? (
                <tr>
                  <td colSpan="7" style={styles.td}>
                    <div style={styles.loadingText}>Loading problems...</div>
                  </td>
                </tr>
              ) : currentProblems.length === 0 ? (
                <tr>
                  <td colSpan="7" style={styles.td}>
                    <div style={styles.emptyText}>
                      {searchTerm || difficultyFilter !== "All"
                        ? "No problems match your filters"
                        : "No problems found. Import or sync to add problems."}
                    </div>
                  </td>
                </tr>
              ) : (
                currentProblems.map((problem) => (
                  <tr key={problem.problemId} style={styles.tableRow}>
                    <td style={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        checked={selectedProblems.includes(problem.problemId)}
                        onChange={() => toggleSelect(problem.problemId)}
                        style={styles.checkbox}
                      />
                    </td>
                    <td style={styles.td}>
                      <code style={styles.problemIdCode}>
                        {problem.problemId}
                      </code>
                    </td>
                    <td style={styles.td}>
                      <strong>{problem.title}</strong>
                      <div style={styles.tags}>
                        {problem.tags?.slice(0, 2).map((tag) => (
                          <span key={tag} style={styles.tag}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.difficultyBadge,
                          backgroundColor:
                            getDifficultyColor(problem.difficulty) + "20",
                          color: getDifficultyColor(problem.difficulty),
                        }}
                      >
                        {problem.difficulty}
                      </span>
                    </td>
                    <td style={styles.td}>{problem.totalSubmissions || 0}</td>
                    <td style={styles.td}>
                      <div style={styles.acceptanceBar}>
                        <div
                          style={{
                            ...styles.acceptanceFill,
                            width: `${problem.acceptanceRate || 0}%`,
                            backgroundColor: getDifficultyColor(
                              problem.difficulty,
                            ),
                          }}
                        />
                        <span style={styles.acceptanceText}>
                          {(problem.acceptanceRate || 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() =>
                          handleDeleteProblem(problem.problemId, problem.title)
                        }
                        disabled={deleting === problem.problemId}
                        style={styles.deleteButton}
                        title="Delete Problem"
                      >
                        {deleting === problem.problemId ? "..." : "🗑️"}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProblem(problem);
                          setShowTestCaseManager(true);
                        }}
                        style={styles.manageTestsButton}
                        title="Manage Test Cases"
                      >
                        🧪 Tests
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              style={styles.pageButton}
            >
              « First
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={styles.pageButton}
            >
              ‹ Previous
            </button>
            <span style={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={styles.pageButton}
            >
              Next ›
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              style={styles.pageButton}
            >
              Last »
            </button>
          </div>
        )}
      </div>

      {/* Google Sheets Section */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardIcon}>📊</span>
          <h2 style={styles.cardTitle}>Google Sheets Integration</h2>
        </div>
        <p style={styles.cardDescription}>
          Sync problems from Google Sheets to your database. Add or update
          problems in your sheet and click "Sync Now".
        </p>

        <div style={styles.buttonGroup}>
          <button
            onClick={handlePreview}
            disabled={loadingPreview}
            style={{ ...styles.button, ...styles.buttonPreview }}
          >
            {loadingPreview ? "Loading..." : "👁️ Preview Problems"}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{ ...styles.button, ...styles.buttonSync }}
          >
            {syncing ? "Syncing..." : "🔄 Sync Now"}
          </button>
        </div>

        {/* Preview Results */}
        {preview && (
          <div style={styles.previewSection}>
            <h3 style={styles.previewTitle}>
              📋 Preview ({preview.count} problems found in Google Sheets)
            </h3>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Difficulty</th>
                    <th style={styles.th}>Test Cases</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.problems?.slice(0, 10).map((problem, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{problem.problemId}</td>
                      <td style={styles.td}>{problem.title}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.difficultyBadge,
                            ...(problem.difficulty === "Easy"
                              ? styles.easy
                              : problem.difficulty === "Medium"
                                ? styles.medium
                                : styles.hard),
                          }}
                        >
                          {problem.difficulty}
                        </span>
                      </td>
                      <td style={styles.td}>{problem.testCasesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.count > 10 && (
              <p style={styles.moreText}>
                + {preview.count - 10} more problems...
              </p>
            )}
            <button onClick={handleSync} style={styles.syncButton}>
              ⚡ Import All {preview.count} Problems
            </button>
          </div>
        )}
      </div>

      {/* Excel Import Section */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardIcon}>📁</span>
          <h2 style={styles.cardTitle}>Excel Import</h2>
        </div>
        <p style={styles.cardDescription}>
          Import problems from Excel file. Download the template, fill it with
          your problems, and upload.
        </p>

        <div style={styles.buttonGroup}>
          <button
            onClick={downloadTemplate}
            style={{ ...styles.button, ...styles.buttonTemplate }}
          >
            📥 Download Template
          </button>
        </div>

        <div style={styles.uploadArea}>
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            style={styles.fileInput}
          />
          {file && (
            <div style={styles.fileInfo}>
              <span>📄 {file.name}</span>
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={styles.uploadButton}
              >
                {uploading ? "Uploading..." : "📤 Upload & Import"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions Card */}
      <div style={styles.instructionsCard}>
        <h3 style={styles.instructionsTitle}>📖 How to Use</h3>
        <ul style={styles.instructionsList}>
          <li>
            <strong>Search/Filter:</strong> Use search bar to find problems by
            title or ID, filter by difficulty
          </li>
          <li>
            <strong>Delete Problems:</strong> Click delete button, select
            individual checkboxes, or use "Select All" for bulk delete
          </li>
          <li>
            <strong>Manage Test Cases:</strong> Click "🧪 Tests" button to add,
            edit, or remove test cases for any problem
          </li>
          <li>
            <strong>Google Sheets:</strong> Add problems to your Google Sheet →
            Click "Preview Problems" → Click "Sync Now"
          </li>
          <li>
            <strong>Excel Import:</strong> Download template → Fill with
            problems → Upload file
          </li>
          <li>
            <strong>Auto-sync:</strong> Server syncs automatically every 5
            minutes from Google Sheets
          </li>
        </ul>
      </div>

      {/* Test Case Manager Modal */}
      {showTestCaseManager && selectedProblem && (
        <TestCaseManager
          problemId={selectedProblem.problemId}
          problemTitle={selectedProblem.title}
          onClose={() => {
            setShowTestCaseManager(false);
            setSelectedProblem(null);
          }}
          onUpdate={() => {
            fetchProblems();
          }}
        />
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "2rem",
    minHeight: "100vh",
    backgroundColor: "#f3f4f6",
  },
  header: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "2rem",
    marginBottom: "2rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  headerTitle: {
    fontSize: "2rem",
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: "0.5rem",
  },
  headerSubtitle: { color: "#6b7280", fontSize: "1rem" },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "2rem",
    marginBottom: "2rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  cardIcon: { fontSize: "2rem" },
  cardTitle: { fontSize: "1.5rem", fontWeight: "600", color: "#1f2937" },
  problemCount: {
    marginLeft: "auto",
    fontSize: "0.875rem",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
  },
  filterBar: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  },
  searchWrapper: { flex: 1, position: "relative", minWidth: "200px" },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "1rem",
  },
  searchInput: {
    width: "100%",
    padding: "0.6rem 0.75rem 0.6rem 2.5rem",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "0.875rem",
  },
  filterSelect: {
    padding: "0.6rem 1rem",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "0.875rem",
    backgroundColor: "white",
    cursor: "pointer",
  },
  perPageSelect: {
    padding: "0.6rem 1rem",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "0.875rem",
    backgroundColor: "white",
    cursor: "pointer",
  },
  bulkActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  bulkLeft: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "wrap",
  },
  selectAllLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.875rem",
    color: "#4b5563",
    cursor: "pointer",
  },
  selectPageButton: {
    padding: "0.25rem 0.75rem",
    backgroundColor: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "0.75rem",
    cursor: "pointer",
  },
  checkboxCell: { width: "40px", padding: "0.75rem", textAlign: "center" },
  checkbox: { width: "18px", height: "18px", cursor: "pointer" },
  deleteButton: {
    padding: "0.25rem 0.5rem",
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.875rem",
    marginRight: "5px",
  },
  manageTestsButton: {
    padding: "0.25rem 0.5rem",
    backgroundColor: "#8b5cf6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  deleteSelectedButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "600",
  },
  loadingText: { textAlign: "center", padding: "2rem", color: "#6b7280" },
  emptyText: { textAlign: "center", padding: "2rem", color: "#6b7280" },
  tags: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.25rem",
    flexWrap: "wrap",
  },
  tag: {
    padding: "0.125rem 0.5rem",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    borderRadius: "12px",
    fontSize: "0.7rem",
  },
  difficultyBadge: {
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.75rem",
    fontWeight: "600",
  },
  easy: { backgroundColor: "#d1fae5", color: "#065f46" },
  medium: { backgroundColor: "#fed7aa", color: "#92400e" },
  hard: { backgroundColor: "#fee2e2", color: "#991b1b" },
  tableWrapper: { overflowX: "auto", marginBottom: "1rem" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableHeader: {
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
  },
  th: {
    padding: "0.75rem",
    textAlign: "left",
    fontWeight: "600",
    color: "#374151",
    fontSize: "0.875rem",
  },
  tableRow: {
    borderBottom: "1px solid #e5e7eb",
    transition: "background-color 0.2s",
  },
  td: { padding: "0.75rem", color: "#4b5563", fontSize: "0.875rem" },
  problemIdCode: {
    fontFamily: "monospace",
    fontSize: "0.75rem",
    backgroundColor: "#f3f4f6",
    padding: "0.125rem 0.375rem",
    borderRadius: "4px",
  },
  acceptanceBar: {
    position: "relative",
    width: "100px",
    height: "24px",
    backgroundColor: "#e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
  },
  acceptanceFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    transition: "width 0.3s ease",
  },
  acceptanceText: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    fontSize: "0.7rem",
    fontWeight: "500",
    color: "#1f2937",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "1.5rem",
    flexWrap: "wrap",
  },
  pageButton: {
    padding: "0.4rem 0.8rem",
    backgroundColor: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.875rem",
    transition: "all 0.2s",
    ":hover": { backgroundColor: "#e5e7eb" },
    ":disabled": { opacity: 0.5, cursor: "not-allowed" },
  },
  pageInfo: {
    padding: "0.4rem 0.8rem",
    fontSize: "0.875rem",
    color: "#6b7280",
  },
  buttonGroup: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "1rem",
  },
  button: {
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  buttonPreview: { backgroundColor: "#3b82f6", color: "white" },
  buttonSync: { backgroundColor: "#10b981", color: "white" },
  buttonTemplate: { backgroundColor: "#8b5cf6", color: "white" },
  previewSection: {
    marginTop: "2rem",
    paddingTop: "2rem",
    borderTop: "1px solid #e5e7eb",
  },
  previewTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    marginBottom: "1rem",
    color: "#1f2937",
  },
  syncButton: {
    width: "100%",
    padding: "0.75rem",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "1rem",
  },
  moreText: {
    textAlign: "center",
    padding: "0.5rem",
    color: "#6b7280",
    fontSize: "0.875rem",
  },
  uploadArea: {
    marginTop: "1rem",
    padding: "1rem",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    border: "1px dashed #d1d5db",
  },
  fileInput: { width: "100%", padding: "0.5rem", cursor: "pointer" },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "1rem",
    padding: "0.75rem",
    backgroundColor: "#e5e7eb",
    borderRadius: "8px",
  },
  uploadButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
  },
  instructionsCard: {
    backgroundColor: "#fef3c7",
    borderRadius: "12px",
    padding: "1.5rem",
    border: "1px solid #fde68a",
  },
  instructionsTitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#92400e",
    marginBottom: "0.75rem",
  },
  instructionsList: {
    color: "#78350f",
    lineHeight: "1.75",
    paddingLeft: "1.5rem",
  },
};

export default AdminPanel;
