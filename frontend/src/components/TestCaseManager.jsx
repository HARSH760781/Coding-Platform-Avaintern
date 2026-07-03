import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const TestCaseManager = ({ problemId, problemTitle, onClose, onUpdate }) => {
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    fetchTestCases();
  }, [problemId]);

  const fetchTestCases = async () => {
    try {
      const response = await api.get(`/testcases/${problemId}`);
      setTestCases(response.data.testCases || []);
    } catch (error) {
      toast.error("Failed to load test cases");
    } finally {
      setLoading(false);
    }
  };

  const addTestCase = () => {
    setTestCases([
      ...testCases,
      {
        input: "",
        expectedOutput: "",
        isHidden: false,
        explanation: "",
      },
    ]);
    setEditingIndex(testCases.length);
  };

  const updateTestCase = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const deleteTestCase = async (index) => {
    if (!window.confirm("Delete this test case?")) return;

    try {
      await api.delete(`/testcases/${problemId}/${index}`);
      toast.success("Test case deleted");
      fetchTestCases();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const saveAll = async () => {
    try {
      await api.put(`/testcases/${problemId}`, { testCases });
      toast.success("All test cases saved!");
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      toast.error("Failed to save");
    }
  };

  if (loading) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modalContent}>
          <div style={styles.loading}>Loading test cases...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h2>Test Cases: {problemTitle}</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.statsBar}>
            <span>📊 Total: {testCases.length} test cases</span>
            <span>
              👁️ Visible: {testCases.filter((t) => !t.isHidden).length}
            </span>
            <span>🔒 Hidden: {testCases.filter((t) => t.isHidden).length}</span>
          </div>

          {testCases.map((tc, idx) => (
            <div key={idx} style={styles.testCaseCard}>
              <div style={styles.testCaseHeader}>
                <h3>Test Case #{idx + 1}</h3>
                <button
                  onClick={() => deleteTestCase(idx)}
                  style={styles.deleteButton}
                >
                  🗑️ Delete
                </button>
              </div>

              <div style={styles.formGroup}>
                <label>Input:</label>
                <textarea
                  value={tc.input}
                  onChange={(e) => updateTestCase(idx, "input", e.target.value)}
                  placeholder="e.g., [2,7,11,15]\n9"
                  rows={3}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Expected Output:</label>
                <input
                  type="text"
                  value={tc.expectedOutput}
                  onChange={(e) =>
                    updateTestCase(idx, "expectedOutput", e.target.value)
                  }
                  placeholder="e.g., [0,1]"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={tc.isHidden}
                    onChange={(e) =>
                      updateTestCase(idx, "isHidden", e.target.checked)
                    }
                  />
                  <span>🔒 Hidden Test Case (students won't see this)</span>
                </label>
              </div>

              <div style={styles.formGroup}>
                <label>Explanation (optional):</label>
                <input
                  type="text"
                  value={tc.explanation || ""}
                  onChange={(e) =>
                    updateTestCase(idx, "explanation", e.target.value)
                  }
                  placeholder="Why this test case matters"
                  style={styles.input}
                />
              </div>
            </div>
          ))}

          <button onClick={addTestCase} style={styles.addButton}>
            + Add Test Case
          </button>
        </div>

        <div style={styles.modalFooter}>
          <button onClick={onClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={saveAll} style={styles.saveButton}>
            Save All Test Cases
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#1f2937",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "800px",
    maxHeight: "90vh",
    overflow: "auto",
    padding: "20px",
    color: "#fff",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "10px",
    borderBottom: "1px solid #374151",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#9ca3af",
  },
  statsBar: {
    display: "flex",
    gap: "20px",
    padding: "10px",
    backgroundColor: "#374151",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  testCaseCard: {
    border: "1px solid #374151",
    borderRadius: "8px",
    padding: "15px",
    marginBottom: "15px",
    backgroundColor: "#111827",
  },
  testCaseHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  formGroup: {
    marginBottom: "12px",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    border: "1px solid #374151",
    borderRadius: "4px",
    backgroundColor: "#1f2937",
    color: "#fff",
    fontFamily: "monospace",
  },
  input: {
    width: "100%",
    padding: "8px",
    border: "1px solid #374151",
    borderRadius: "4px",
    backgroundColor: "#1f2937",
    color: "#fff",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  addButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    color: "white",
    padding: "5px 10px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
    paddingTop: "15px",
    borderTop: "1px solid #374151",
  },
  saveButton: {
    backgroundColor: "#3b82f6",
    color: "white",
    padding: "8px 20px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  cancelButton: {
    backgroundColor: "#6b7280",
    color: "white",
    padding: "8px 20px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
  },
};

export default TestCaseManager;
