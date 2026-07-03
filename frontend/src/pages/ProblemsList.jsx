// frontend/src/pages/ProblemsList.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/logo.png";
import { getProblems } from "../services/api";
import toast from "react-hot-toast";
import {
  Code2,
  ChevronRight,
  Brain,
  Rocket,
  CheckCircle2,
  Circle,
  Zap,
  Sparkles,
  Award,
  Flame,
  Search,
  TrendingUp,
  Clock,
  Target,
  Medal,
  Star,
  Eye,
  Shield, // ✅ Added Shield icon for admin
} from "lucide-react";

const ProblemsList = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [stats, setStats] = useState({ total: 0, easy: 0, medium: 0, hard: 0 });
  const [hoveredProblem, setHoveredProblem] = useState(null);

  // ✅ Check if user is admin - Replace with your actual admin check logic
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // ✅ Check user role from localStorage or context
    const checkAdminStatus = () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        // Check if user has admin role
        // Adjust this based on your actual user object structure
        setIsAdmin(user?.role === "admin" || user?.isAdmin === true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
    fetchProblems();
    checkSolvedProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const response = await getProblems();
      const problemsData = response.data.problems || [];
      setProblems(problemsData);

      const easy = problemsData.filter((p) => p.difficulty === "Easy").length;
      const medium = problemsData.filter(
        (p) => p.difficulty === "Medium",
      ).length;
      const hard = problemsData.filter((p) => p.difficulty === "Hard").length;
      setStats({ total: problemsData.length, easy, medium, hard });
    } catch (error) {
      console.error("Error fetching problems:", error);
      toast.error("Failed to load problems");
    } finally {
      setLoading(false);
    }
  };

  const checkSolvedProblems = () => {
    const solved = JSON.parse(localStorage.getItem("solvedProblems") || "[]");
    setSolvedProblems(solved);
  };

  const getDifficultyStyles = (difficulty) => {
    switch (difficulty) {
      case "Easy":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          dot: "bg-emerald-500",
          glow: "shadow-emerald-100",
        };
      case "Medium":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          dot: "bg-amber-500",
          glow: "shadow-amber-100",
        };
      case "Hard":
        return {
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-200",
          dot: "bg-rose-500",
          glow: "shadow-rose-100",
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-700",
          border: "border-gray-200",
          dot: "bg-gray-500",
          glow: "shadow-gray-100",
        };
    }
  };

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty) {
      case "Easy":
        return <Zap className="w-3 h-3 text-emerald-500" />;
      case "Medium":
        return <Flame className="w-3 h-3 text-amber-500" />;
      case "Hard":
        return <Award className="w-3 h-3 text-rose-500" />;
      default:
        return <Circle className="w-3 h-3 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Code2 className="w-6 h-6 text-indigo-600 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-500 mt-6 font-medium">
            Loading challenges...
          </p>
        </div>
      </div>
    );
  }

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = problem.title
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchesDifficulty =
      difficulty === "All" || problem.difficulty === difficulty;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================ */}
      {/* ✨ PREMIUM HEADER - Responsive */}
      {/* ============================================ */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left - Logo & Brand */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
              <div className="flex-shrink-0">
                <img
                  src={Logo}
                  alt="CodeArena"
                  className="h-10 sm:h-12 md:h-14 w-auto object-contain"
                />
              </div>

              <div className="border-l border-gray-200 pl-3 sm:pl-4">
                <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    CodeArena
                  </span>
                  <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    Beta
                  </span>
                </h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-500 text-[8px] sm:text-[10px] font-medium tracking-wide uppercase">
                      Live
                    </span>
                  </div>
                  <span className="w-px h-3 bg-gray-200"></span>
                  <span className="text-gray-500 text-[8px] sm:text-[10px] flex items-center gap-1 font-medium">
                    <Brain className="w-3 h-3 text-indigo-500" />
                    <span className="text-gray-700">{problems.length}</span>
                    <span className="text-gray-400 hidden xs:inline">
                      Challenges
                    </span>
                  </span>
                  <span className="w-px h-3 bg-gray-200"></span>
                  <span className="text-gray-500 text-[8px] sm:text-[10px] flex items-center gap-1 font-medium">
                    <Award className="w-3 h-3 text-amber-500" />
                    <span className="text-gray-700">
                      {solvedProblems.length}
                    </span>
                    <span className="text-gray-400 hidden xs:inline">
                      Solved
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right - Stats & Admin Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <span className="text-emerald-600 font-semibold text-xs sm:text-sm">
                    {stats.easy}
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                  <span className="text-amber-600 font-semibold text-xs sm:text-sm">
                    {stats.medium}
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                  <span className="text-rose-600 font-semibold text-xs sm:text-sm">
                    {stats.hard}
                  </span>
                </div>
              </div>

              {/* ✅ Admin Button - Only visible to admin */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-all duration-300 text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Admin Panel</span>
                  <span className="xs:hidden">Admin</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* MAIN CONTENT - Responsive */}
      {/* ============================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Stats Cards - 2x2 on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                  Total
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5">
                  {stats.total}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Code2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] sm:text-xs text-gray-500">
                Active problems
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                  Solved
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5">
                  {solvedProblems.length}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-center gap-1">
              <Target className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] sm:text-xs text-gray-500">
                {stats.total > 0
                  ? Math.round((solvedProblems.length / stats.total) * 100)
                  : 0}
                % completion
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                  Success Rate
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5">
                  {problems.length > 0
                    ? Math.round(
                        problems.reduce(
                          (acc, p) => acc + (p.acceptanceRate || 0),
                          0,
                        ) / problems.length,
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] sm:text-xs text-gray-500">
                Average acceptance
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter - Responsive */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search challenges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm cursor-pointer w-full sm:w-auto"
          >
            <option value="All">📊 All Levels</option>
            <option value="Easy">🟢 Easy</option>
            <option value="Medium">🟡 Medium</option>
            <option value="Hard">🔴 Hard</option>
          </select>
        </div>

        {/* Problems List - Responsive */}
        <div className="space-y-2 sm:space-y-3">
          {filteredProblems.map((problem, idx) => {
            const isSolved = solvedProblems.includes(problem.problemId);
            const difficultyStyle = getDifficultyStyles(problem.difficulty);
            const isHovered = hoveredProblem === problem._id;

            return (
              <div
                key={problem._id}
                className={`group relative bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 ${
                  isHovered
                    ? `shadow-lg ${difficultyStyle.glow}`
                    : "shadow-sm hover:shadow-md"
                }`}
                onMouseEnter={() => setHoveredProblem(problem._id)}
                onMouseLeave={() => setHoveredProblem(null)}
              >
                <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {/* Left - Problem Info */}
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* Problem Number */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-mono text-xs sm:text-sm transition-all ${
                          isHovered
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                            : "bg-gray-50 text-gray-500 border border-gray-100"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      {isSolved && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                          <CheckCircle2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Title & Tags */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`text-sm sm:text-base font-semibold text-gray-800 transition-colors ${
                            isHovered ? "text-indigo-700" : ""
                          } truncate max-w-[120px] xs:max-w-[200px] sm:max-w-none`}
                        >
                          {problem.title}
                        </h3>
                        {isSolved && (
                          <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] sm:text-[10px] font-medium rounded-full border border-emerald-200 whitespace-nowrap">
                            Solved
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-gray-400 text-[8px] sm:text-[10px] whitespace-nowrap">
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          {problem.timeLimit || 2}s
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5 sm:mt-1">
                        {problem.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 sm:px-2 py-0.5 bg-gray-50 rounded-full text-gray-500 text-[8px] sm:text-[10px] border border-gray-100"
                          >
                            #{tag}
                          </span>
                        ))}
                        {problem.tags?.length > 2 && (
                          <span className="text-gray-400 text-[8px] sm:text-[10px]">
                            +{problem.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right - Status & Action */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Difficulty */}
                    <div
                      className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 ${difficultyStyle.bg} ${difficultyStyle.text} rounded-full border ${difficultyStyle.border}`}
                    >
                      {getDifficultyIcon(problem.difficulty)}
                      <span className="text-[9px] sm:text-[11px] font-medium">
                        {problem.difficulty}
                      </span>
                    </div>

                    {/* Acceptance */}
                    <div className="hidden sm:flex items-center gap-1 text-gray-400 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      <span className="font-mono">
                        {problem.acceptanceRate?.toFixed(1) || 0}%
                      </span>
                    </div>

                    {/* Action Button */}
                    <Link
                      to={`/problem/${problem.problemId}`}
                      className={`group/btn flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 ${
                        isSolved
                          ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                          : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/25"
                      }`}
                    >
                      {isSolved ? (
                        <>
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline">Review</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline">Solve</span>
                        </>
                      )}
                      <ChevronRight
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${
                          isSolved ? "" : "group-hover/btn:translate-x-1"
                        }`}
                      />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProblems.length === 0 && (
          <div className="text-center py-8 sm:py-12 bg-white rounded-xl border border-gray-200">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200">
              <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm sm:text-base font-medium">
              No challenges found
            </p>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemsList;
