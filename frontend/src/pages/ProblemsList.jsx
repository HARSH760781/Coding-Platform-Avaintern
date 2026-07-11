// // frontend/src/pages/ProblemsList.jsx
// import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
// import Logo from "../assets/logo.png";
// import { getProblems } from "../services/api";
// import toast from "react-hot-toast";
// import {
//   Code2,
//   ChevronRight,
//   Brain,
//   Rocket,
//   CheckCircle2,
//   Circle,
//   Zap,
//   Sparkles,
//   Award,
//   Flame,
//   Search,
//   TrendingUp,
//   Clock,
//   Target,
//   Medal,
//   Star,
//   Eye,
//   Shield,
// } from "lucide-react";

// const ProblemsList = () => {
//   const [problems, setProblems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [difficulty, setDifficulty] = useState("All");
//   const [solvedProblems, setSolvedProblems] = useState([]);
//   const [stats, setStats] = useState({ total: 0, easy: 0, medium: 0, hard: 0 });
//   const [hoveredProblem, setHoveredProblem] = useState(null);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [authChecked, setAuthChecked] = useState(false);

//   const [testAttempt, setTestAttempt] = useState(null);
//   const [showSubmitModal, setShowSubmitModal] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [timeRemaining, setTimeRemaining] = useState(0);
//   const [testTimer, setTestTimer] = useState(null);
//   const [isTestMode, setIsTestMode] = useState(false);
//   const [testId, setTestId] = useState(null);

//    const navigate = useNavigate();
//   const serverURL = import.meta.env.VITE_BACKEND_URL || "";

//   useEffect(() => {
//     // ✅ Check user role from localStorage
//     const checkAdminStatus = () => {
//       try {
//         // Check multiple possible storage locations
//         const role = localStorage.getItem("role");
//         const userStr = localStorage.getItem("user");
//         const user = userStr ? JSON.parse(userStr) : {};

//         // Also check if token exists (user is logged in)
//         const token = localStorage.getItem("token");

//         // Check if role is admin from various sources
//         const isAdminUser =
//           role === "admin" || user?.role === "admin" || user?.isAdmin === true;

//         // console.log("👤 User role check:", {
//         //   role,
//         //   userRole: user?.role,
//         //   isAdmin: isAdminUser,
//         //   hasToken: !!token,
//         // });

//         setIsAdmin(isAdminUser);
//         setAuthChecked(true);
//       } catch (error) {
//         console.error("Error checking admin status:", error);
//         setIsAdmin(false);
//         setAuthChecked(true);
//       }
//     };

//     checkAdminStatus();
//     fetchProblems();
//     checkSolvedProblems();

//     // ✅ Listen for storage changes (in case auth data comes after page load)
//     const handleStorageChange = (e) => {
//       if (e.key === "role" || e.key === "user" || e.key === "token") {
//         // console.log("🔄 Storage changed, rechecking admin status...");
//         checkAdminStatus();
//       }
//     };
//     window.addEventListener("storage", handleStorageChange);

//     // ✅ Listen for messages from parent window (postMessage)
//     const handleMessage = (event) => {
//       // Verify the sender origin
//       const allowedOrigins = [
//         "https://your-main-app.onrender.com",
//         "http://localhost:5173",
//         "http://localhost:3000",
//       ];

//       if (!allowedOrigins.includes(event.origin)) {
//         return;
//       }

//       if (event.data?.type === "USER_AUTH_DATA") {
//         // console.log("📥 Received auth data via postMessage in ProblemsList");
//         const { role } = event.data.data;
//         if (role === "admin") {
//           setIsAdmin(true);
//           localStorage.setItem("role", "admin");
//         } else {
//           setIsAdmin(false);
//           localStorage.setItem("role", "user");
//         }
//         setAuthChecked(true);
//       }
//     };
//     window.addEventListener("message", handleMessage);

//     return () => {
//       window.removeEventListener("storage", handleStorageChange);
//       window.removeEventListener("message", handleMessage);
//     };
//   }, []);

//   const fetchProblems = async () => {
//     try {
//       const response = await getProblems();
//       const problemsData = response.data.problems || [];
//       setProblems(problemsData);

//       const easy = problemsData.filter((p) => p.difficulty === "Easy").length;
//       const medium = problemsData.filter(
//         (p) => p.difficulty === "Medium",
//       ).length;
//       const hard = problemsData.filter((p) => p.difficulty === "Hard").length;
//       setStats({ total: problemsData.length, easy, medium, hard });
//     } catch (error) {
//       console.error("Error fetching problems:", error);
//       toast.error("Failed to load problems");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const checkSolvedProblems = () => {
//     const solved = JSON.parse(localStorage.getItem("solvedProblems") || "[]");
//     setSolvedProblems(solved);
//   };

//   const getDifficultyStyles = (difficulty) => {
//     switch (difficulty) {
//       case "Easy":
//         return {
//           bg: "bg-emerald-50",
//           text: "text-emerald-700",
//           border: "border-emerald-200",
//           dot: "bg-emerald-500",
//           glow: "shadow-emerald-100",
//         };
//       case "Medium":
//         return {
//           bg: "bg-amber-50",
//           text: "text-amber-700",
//           border: "border-amber-200",
//           dot: "bg-amber-500",
//           glow: "shadow-amber-100",
//         };
//       case "Hard":
//         return {
//           bg: "bg-rose-50",
//           text: "text-rose-700",
//           border: "border-rose-200",
//           dot: "bg-rose-500",
//           glow: "shadow-rose-100",
//         };
//       default:
//         return {
//           bg: "bg-gray-50",
//           text: "text-gray-700",
//           border: "border-gray-200",
//           dot: "bg-gray-500",
//           glow: "shadow-gray-100",
//         };
//     }
//   };

//   const getDifficultyIcon = (difficulty) => {
//     switch (difficulty) {
//       case "Easy":
//         return <Zap className="w-3 h-3 text-emerald-500" />;
//       case "Medium":
//         return <Flame className="w-3 h-3 text-amber-500" />;
//       case "Hard":
//         return <Award className="w-3 h-3 text-rose-500" />;
//       default:
//         return <Circle className="w-3 h-3 text-gray-400" />;
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-50">
//         <div className="text-center">
//           <div className="relative">
//             <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
//             <div className="absolute inset-0 flex items-center justify-center">
//               <Code2 className="w-6 h-6 text-indigo-600 animate-pulse" />
//             </div>
//           </div>
//           <p className="text-gray-500 mt-6 font-medium">
//             Loading challenges...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   const filteredProblems = problems.filter((problem) => {
//     const matchesSearch = problem.title
//       ?.toLowerCase()
//       .includes(search.toLowerCase());
//     const matchesDifficulty =
//       difficulty === "All" || problem.difficulty === difficulty;
//     return matchesSearch && matchesDifficulty;
//   });

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* ============================================ */}
//       {/* ✨ PREMIUM HEADER - Responsive */}
//       {/* ============================================ */}
//       <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
//           <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
//             {/* Left - Logo & Brand */}
//             <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
//               <div className="flex-shrink-0">
//                 <img
//                   src={Logo}
//                   alt="CodeArena"
//                   className="h-10 sm:h-12 md:h-14 w-auto object-contain"
//                 />
//               </div>

//               <div className="border-l border-gray-200 pl-3 sm:pl-4">
//                 <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
//                   <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
//                     CodeArena
//                   </span>
//                   <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
//                     Beta
//                   </span>
//                 </h1>
//                 <div className="flex items-center gap-2 mt-0.5 flex-wrap">
//                   <div className="flex items-center gap-1.5">
//                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
//                     <span className="text-gray-500 text-[8px] sm:text-[10px] font-medium tracking-wide uppercase">
//                       Live
//                     </span>
//                   </div>
//                   <span className="w-px h-3 bg-gray-200"></span>
//                   <span className="text-gray-500 text-[8px] sm:text-[10px] flex items-center gap-1 font-medium">
//                     <Brain className="w-3 h-3 text-indigo-500" />
//                     <span className="text-gray-700">{problems.length}</span>
//                     <span className="text-gray-400 hidden xs:inline">
//                       Challenges
//                     </span>
//                   </span>
//                   <span className="w-px h-3 bg-gray-200"></span>
//                   <span className="text-gray-500 text-[8px] sm:text-[10px] flex items-center gap-1 font-medium">
//                     <Award className="w-3 h-3 text-amber-500" />
//                     <span className="text-gray-700">
//                       {solvedProblems.length}
//                     </span>
//                     <span className="text-gray-400 hidden xs:inline">
//                       Solved
//                     </span>
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* Right - Stats & Admin Button */}
//             <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
//               <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200">
//                 <div className="flex items-center gap-1">
//                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
//                   <span className="text-emerald-600 font-semibold text-xs sm:text-sm">
//                     {stats.easy}
//                   </span>
//                 </div>
//                 <div className="w-px h-4 bg-gray-200"></div>
//                 <div className="flex items-center gap-1">
//                   <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
//                   <span className="text-amber-600 font-semibold text-xs sm:text-sm">
//                     {stats.medium}
//                   </span>
//                 </div>
//                 <div className="w-px h-4 bg-gray-200"></div>
//                 <div className="flex items-center gap-1">
//                   <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
//                   <span className="text-rose-600 font-semibold text-xs sm:text-sm">
//                     {stats.hard}
//                   </span>
//                 </div>
//               </div>

//               {/* ✅ Admin Button - ONLY visible when isAdmin is true */}
//               {isAdmin && authChecked && (
//                 <Link
//                   to="/admin"
//                   className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-all duration-300 text-xs sm:text-sm font-medium whitespace-nowrap"
//                 >
//                   <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
//                   <span className="hidden xs:inline">Admin Panel</span>
//                   <span className="xs:hidden">Admin</span>
//                 </Link>
//               )}

//               {/* Optional: Show a debug indicator (remove in production)
//               {process.env.NODE_ENV === "development" && (
//                 <span className="text-[8px] text-gray-400">
//                   {isAdmin ? "👑" : "👤"}
//                 </span>
//               )} */}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ============================================ */}
//       {/* MAIN CONTENT - Responsive */}
//       {/* ============================================ */}
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
//         {/* Stats Cards */}
//         <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 sm:mb-6">
//           <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
//                   Total
//                 </p>
//                 <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5">
//                   {stats.total}
//                 </p>
//               </div>
//               <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
//                 <Code2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
//               </div>
//             </div>
//             <div className="mt-1 sm:mt-2 flex items-center gap-1">
//               <TrendingUp className="w-3 h-3 text-emerald-500" />
//               <span className="text-[10px] sm:text-xs text-gray-500">
//                 Active problems
//               </span>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
//                   Solved
//                 </p>
//                 <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5">
//                   {solvedProblems.length}
//                 </p>
//               </div>
//               <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
//                 <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
//               </div>
//             </div>
//             <div className="mt-1 sm:mt-2 flex items-center gap-1">
//               <Target className="w-3 h-3 text-emerald-500" />
//               <span className="text-[10px] sm:text-xs text-gray-500">
//                 {stats.total > 0
//                   ? Math.round((solvedProblems.length / stats.total) * 100)
//                   : 0}
//                 % completion
//               </span>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all col-span-2 md:col-span-1">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
//                   Success Rate
//                 </p>
//                 <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5">
//                   {problems.length > 0
//                     ? Math.round(
//                         problems.reduce(
//                           (acc, p) => acc + (p.acceptanceRate || 0),
//                           0,
//                         ) / problems.length,
//                       )
//                     : 0}
//                   %
//                 </p>
//               </div>
//               <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-xl flex items-center justify-center">
//                 <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
//               </div>
//             </div>
//             <div className="mt-1 sm:mt-2 flex items-center gap-1">
//               <Star className="w-3 h-3 text-amber-500" />
//               <span className="text-[10px] sm:text-xs text-gray-500">
//                 Average acceptance
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* Search & Filter */}
//         <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
//           <div className="relative flex-1">
//             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
//               <Search className="w-4 h-4 text-gray-400" />
//             </div>
//             <input
//               type="text"
//               placeholder="Search challenges..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
//             />
//           </div>
//           <select
//             value={difficulty}
//             onChange={(e) => setDifficulty(e.target.value)}
//             className="px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm cursor-pointer w-full sm:w-auto"
//           >
//             <option value="All">📊 All Levels</option>
//             <option value="Easy">🟢 Easy</option>
//             <option value="Medium">🟡 Medium</option>
//             <option value="Hard">🔴 Hard</option>
//           </select>
//         </div>

//         {/* Problems List */}
//         <div className="space-y-2 sm:space-y-3">
//           {filteredProblems.map((problem, idx) => {
//             const isSolved = solvedProblems.includes(problem.problemId);
//             const difficultyStyle = getDifficultyStyles(problem.difficulty);
//             const isHovered = hoveredProblem === problem._id;

//             return (
//               <div
//                 key={problem._id}
//                 className={`group relative bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 ${
//                   isHovered
//                     ? `shadow-lg ${difficultyStyle.glow}`
//                     : "shadow-sm hover:shadow-md"
//                 }`}
//                 onMouseEnter={() => setHoveredProblem(problem._id)}
//                 onMouseLeave={() => setHoveredProblem(null)}
//               >
//                 <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
//                   {/* Left - Problem Info */}
//                   <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
//                     {/* Problem Number */}
//                     <div className="relative flex-shrink-0">
//                       <div
//                         className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-mono text-xs sm:text-sm transition-all ${
//                           isHovered
//                             ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
//                             : "bg-gray-50 text-gray-500 border border-gray-100"
//                         }`}
//                       >
//                         {idx + 1}
//                       </div>
//                       {isSolved && (
//                         <div className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
//                           <CheckCircle2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
//                         </div>
//                       )}
//                     </div>

//                     {/* Title & Tags */}
//                     <div className="flex-1 min-w-0">
//                       <div className="flex items-center gap-2 flex-wrap">
//                         <h3
//                           className={`text-sm sm:text-base font-semibold text-gray-800 transition-colors ${
//                             isHovered ? "text-indigo-700" : ""
//                           } truncate max-w-[120px] xs:max-w-[200px] sm:max-w-none`}
//                         >
//                           {problem.title}
//                         </h3>
//                         {isSolved && (
//                           <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] sm:text-[10px] font-medium rounded-full border border-emerald-200 whitespace-nowrap">
//                             Solved
//                           </span>
//                         )}
//                         <span className="flex items-center gap-1 text-gray-400 text-[8px] sm:text-[10px] whitespace-nowrap">
//                           <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
//                           {problem.timeLimit || 2}s
//                         </span>
//                       </div>
//                       <div className="flex flex-wrap gap-1 mt-0.5 sm:mt-1">
//                         {problem.tags?.slice(0, 2).map((tag) => (
//                           <span
//                             key={tag}
//                             className="px-1.5 sm:px-2 py-0.5 bg-gray-50 rounded-full text-gray-500 text-[8px] sm:text-[10px] border border-gray-100"
//                           >
//                             #{tag}
//                           </span>
//                         ))}
//                         {problem.tags?.length > 2 && (
//                           <span className="text-gray-400 text-[8px] sm:text-[10px]">
//                             +{problem.tags.length - 2}
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                   </div>

//                   {/* Right - Status & Action */}
//                   <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
//                     {/* Difficulty */}
//                     <div
//                       className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 ${difficultyStyle.bg} ${difficultyStyle.text} rounded-full border ${difficultyStyle.border}`}
//                     >
//                       {getDifficultyIcon(problem.difficulty)}
//                       <span className="text-[9px] sm:text-[11px] font-medium">
//                         {problem.difficulty}
//                       </span>
//                     </div>

//                     {/* Acceptance */}
//                     <div className="hidden sm:flex items-center gap-1 text-gray-400 text-xs">
//                       <TrendingUp className="w-3 h-3" />
//                       <span className="font-mono">
//                         {problem.acceptanceRate?.toFixed(1) || 0}%
//                       </span>
//                     </div>

//                     {/* Action Button */}
//                     <Link
//                       to={`/problem/${problem.problemId}`}
//                       className={`group/btn flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 ${
//                         isSolved
//                           ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
//                           : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/25"
//                       }`}
//                     >
//                       {isSolved ? (
//                         <>
//                           <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
//                           <span className="hidden xs:inline">Review</span>
//                         </>
//                       ) : (
//                         <>
//                           <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
//                           <span className="hidden xs:inline">Solve</span>
//                         </>
//                       )}
//                       <ChevronRight
//                         className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${
//                           isSolved ? "" : "group-hover/btn:translate-x-1"
//                         }`}
//                       />
//                     </Link>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>

//         {filteredProblems.length === 0 && (
//           <div className="text-center py-8 sm:py-12 bg-white rounded-xl border border-gray-200">
//             <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200">
//               <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" />
//             </div>
//             <p className="text-gray-500 text-sm sm:text-base font-medium">
//               No challenges found
//             </p>
//             <p className="text-gray-400 text-xs sm:text-sm mt-1">
//               Try adjusting your search or filters
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ProblemsList;

// frontend/src/pages/ProblemsList.jsx

// frontend/src/pages/ProblemsList.jsx

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Shield,
  Send,
  AlertTriangle,
  Timer,
  X,
  Loader2,
} from "lucide-react";

const ProblemsList = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [stats, setStats] = useState({ total: 0, easy: 0, medium: 0, hard: 0 });
  const [hoveredProblem, setHoveredProblem] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // ✅ Test tracking states
  const [testAttempt, setTestAttempt] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [testTimer, setTestTimer] = useState(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testId, setTestId] = useState(null);
  const [testDuration, setTestDuration] = useState(0);

  const navigate = useNavigate();
  const serverURL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    // ✅ Check if in test mode from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const urlTestId = urlParams.get("testId");
    const storedTestId = localStorage.getItem("currentTestId");
    const finalTestId = urlTestId || storedTestId;

    console.log("🔍 Test ID from URL:", urlTestId);
    console.log("🔍 Test ID from localStorage:", storedTestId);
    console.log("🔍 Final Test ID:", finalTestId);

    if (finalTestId) {
      setTestId(finalTestId);
      setIsTestMode(true);
      localStorage.setItem("currentTestId", finalTestId);
      console.log("✅ Test mode enabled with ID:", finalTestId);
    } else {
      console.log("❌ No test ID found, normal mode");
    }

    // ✅ Check user role from localStorage
    const checkAdminStatus = () => {
      try {
        const role = localStorage.getItem("role");
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : {};
        const token = localStorage.getItem("token");

        const isAdminUser =
          role === "admin" || user?.role === "admin" || user?.isAdmin === true;

        setIsAdmin(isAdminUser);
        setAuthChecked(true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        setAuthChecked(true);
      }
    };

    checkAdminStatus();
    fetchProblems();
    checkSolvedProblems();

    // ✅ If in test mode, check attempt status and start timer
    if (finalTestId) {
      checkTestAttempt(finalTestId);
      startTestTimer(finalTestId);
    }

    // ✅ Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key === "role" || e.key === "user" || e.key === "token") {
        checkAdminStatus();
      }
      if (e.key === "currentTestId") {
        const newTestId = localStorage.getItem("currentTestId");
        if (newTestId) {
          setTestId(newTestId);
          setIsTestMode(true);
          checkTestAttempt(newTestId);
          startTestTimer(newTestId);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // ✅ Listen for messages from parent window
    const handleMessage = (event) => {
      const allowedOrigins = [
        "https://avainternlms.in",
        "http://localhost:5173",
        "http://localhost:3000",
        "https://coding-platform-avaintern-1.onrender.com",
      ];

      if (!allowedOrigins.includes(event.origin)) {
        return;
      }

      if (event.data?.type === "USER_AUTH_DATA") {
        console.log("📥 Received auth data:", event.data.data);
        const { role, testId: receivedTestId } = event.data.data;

        if (role === "admin") {
          setIsAdmin(true);
          localStorage.setItem("role", "admin");
        } else {
          setIsAdmin(false);
          localStorage.setItem("role", "user");
        }

        if (receivedTestId) {
          setTestId(receivedTestId);
          setIsTestMode(true);
          localStorage.setItem("currentTestId", receivedTestId);
          checkTestAttempt(receivedTestId);
          startTestTimer(receivedTestId);
          console.log(
            "✅ Test mode enabled via postMessage with ID:",
            receivedTestId,
          );
        }
        setAuthChecked(true);
      }
    };
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("message", handleMessage);
      if (testTimer) clearInterval(testTimer);
    };
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

  // ✅ Check test attempt status
  const checkTestAttempt = async (testId) => {
    try {
      const token = localStorage.getItem("token");
      console.log(
        "🔍 Making API call to:",
        `${serverURL}/coding/attempt-status/${testId}`,
      );
      console.log("🔍 Token:", token ? "Present" : "Missing");

      const response = await fetch(
        `${serverURL}/coding/attempt-status/${testId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("📡 Response status:", response.status);
      const data = await response.json();
      console.log(
        "📊 FULL ATTEMPT STATUS RESPONSE:",
        JSON.stringify(data, null, 2),
      );
      console.log("📊 data.success:", data.success);
      console.log("📊 data.status:", data.status);
      console.log("📊 data.hasAttempted:", data.hasAttempted);
      console.log("📊 Full data:", data);

      if (data.success) {
        setTestAttempt(data);

        // Log what we're setting
        console.log("✅ TestAttempt set to:", data);
      } else {
        console.log("❌ API returned success: false");
      }
    } catch (error) {
      console.error("❌ Error checking test attempt:", error);
    }
  };
  // ✅ Start test timer for auto-submit
  const startTestTimer = async (testId) => {
    try {
      const token = localStorage.getItem("token");
      console.log(
        "🔍 Making API call to:",
        `${serverURL}/coding/test-status/${testId}`,
      );

      const response = await fetch(
        `${serverURL}/coding/test-status/${testId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("📡 Test status response status:", response.status);
      const data = await response.json();
      console.log(
        "📊 FULL TEST STATUS RESPONSE:",
        JSON.stringify(data, null, 2),
      );
      console.log("📊 data.success:", data.success);
      console.log("📊 data.status:", data.status);
      console.log("📊 data.timeRemaining:", data.timeRemaining);

      if (data.success && data.status === "active") {
        setTimeRemaining(data.timeRemaining);
        setTestDuration(data.duration || 0);
        console.log("✅ Timer set to:", data.timeRemaining);

        const timer = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1000) {
              clearInterval(timer);
              toast.error("⏰ Test time is over! Auto-submitting...");
              handleSubmitTest(true);
              return 0;
            }
            return prev - 1000;
          });
        }, 1000);

        setTestTimer(timer);
      } else if (data.status === "ended") {
        toast.error("⏰ Test has already ended!");
        handleSubmitTest(true);
      } else {
        console.log("⚠️ Test not active. Status:", data.status);
      }
    } catch (error) {
      console.error("❌ Error getting test status:", error);
    }
  };

  // ✅ Format time remaining
  const formatTime = (ms) => {
    if (!ms || ms <= 0) return "00:00:00";

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, "0");

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // ✅ Handle test submission (auto or manual)
  const handleSubmitTest = async (isAuto = false) => {
    if (submitting) return;

    if (!testAttempt || testAttempt.solutions?.length === 0) {
      if (!isAuto) {
        toast.error("You haven't attempted any problems yet!");
      }
      return;
    }

    if (isAuto) {
      await confirmSubmit(true);
    } else {
      setShowSubmitModal(true);
    }
  };

  // ✅ Confirm submission
  const confirmSubmit = async (isAuto = false) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`${serverURL}/coding/submit-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ testId }),
      });

      const data = await response.json();
      console.log("📤 Submit response:", data);

      if (data.success) {
        toast.success(
          isAuto
            ? "⏰ Test auto-submitted successfully!"
            : "✅ Test submitted successfully!",
        );
        setShowSubmitModal(false);
        if (testTimer) clearInterval(testTimer);

        navigate("/test-completed", {
          state: {
            percentage: data.test.percentage,
            passed: data.test.passed,
            passedCount: data.test.passedCount,
            totalProblems: data.test.totalProblems,
          },
        });
      } else {
        toast.error(data.error || "Failed to submit test");
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      toast.error("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
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
      {/* MAIN CONTENT - Responsive */}
      {/* ============================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Stats Cards */}
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

        {/* Search & Filter */}
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

        {/* Problems List */}
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

      {/* ============================================ */}
      {/* ✅ Submit Confirmation Modal */}
      {/* ============================================ */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Submit Test?
                  </h3>
                  <p className="text-sm text-gray-500">
                    You have {testAttempt?.solutions?.length || 0} solutions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <strong>{testAttempt?.solutions?.length || 0}</strong>{" "}
                  problems attempted
                </p>
                <p className="text-sm text-gray-600">
                  <strong>{testAttempt?.passedCount || 0}</strong> problems
                  solved
                </p>
                <p className="text-sm text-gray-600">
                  Score:{" "}
                  <strong>{testAttempt?.percentage?.toFixed(1) || 0}%</strong>
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Once submitted, you cannot make any more changes to your
                    test.
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmSubmit(false)}
                disabled={submitting}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  submitting
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-lg hover:shadow-emerald-500/25"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemsList;
