import { useState, useEffect } from "react";
import SplashScreen from "./screens/SplashScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SkillDetailScreen from "./screens/SkillDetailScreen";
import SubtopicScreen from "./screens/SubtopicScreen";
import QuizScreen from "./screens/QuizScreen";
import CodingChallengeScreen from "./screens/CodingChallengeScreen";
import SolutionAnalysisScreen from "./screens/SolutionAnalysisScreen";
import ContentOpsScreen from "./screens/ContentOpsScreen";
import TabBar from "./components/TabBar";

export type Screen =
  | "splash"
  | "home"
  | "login"
  | "dashboard"
  | "skill-detail"
  | "subtopic"
  | "quiz"
  | "coding-challenge"
  | "solution-analysis"
  | "content-ops";

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const navigate = (s: Screen) => setScreen(s);

  const showTabBar =
    isLoggedIn &&
    ["dashboard", "skill-detail", "coding-challenge", "content-ops"].includes(screen);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "dashboard") navigate("dashboard");
    else if (tab === "skills") navigate("skill-detail");
    else if (tab === "challenges") navigate("coding-challenge");
    else if (tab === "manage") navigate("content-ops");
  };

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{
        background: "#0E1220",
        color: "#EDEFF7",
        fontFamily: "Inter, sans-serif",
        height: "100dvh",
        maxWidth: "430px",
        margin: "0 auto",
      }}
    >
      <div className="flex-1 overflow-hidden relative">
        {screen === "splash" && (
          <SplashScreen onDone={() => navigate("home")} />
        )}
        {screen === "home" && (
          <HomeScreen onLogin={() => navigate("login")} />
        )}
        {screen === "login" && (
          <LoginScreen
            onSuccess={() => {
              setIsLoggedIn(true);
              navigate("dashboard");
            }}
          />
        )}
        {screen === "dashboard" && (
          <DashboardScreen
            onSkill={() => navigate("skill-detail")}
            onManage={() => navigate("content-ops")}
          />
        )}
        {screen === "skill-detail" && (
          <SkillDetailScreen
            onNode={() => navigate("subtopic")}
            onBack={() => navigate("dashboard")}
          />
        )}
        {screen === "subtopic" && (
          <SubtopicScreen
            onQuiz={() => navigate("quiz")}
            onBack={() => navigate("skill-detail")}
          />
        )}
        {screen === "quiz" && (
          <QuizScreen
            onPass={() => navigate("coding-challenge")}
            onBack={() => navigate("subtopic")}
          />
        )}
        {screen === "coding-challenge" && (
          <CodingChallengeScreen
            onSolve={() => navigate("solution-analysis")}
            onBack={() => navigate("dashboard")}
          />
        )}
        {screen === "solution-analysis" && (
          <SolutionAnalysisScreen onDone={() => navigate("dashboard")} />
        )}
        {screen === "content-ops" && (
          <ContentOpsScreen onBack={() => navigate("dashboard")} />
        )}
      </div>

      {showTabBar && (
        <TabBar active={activeTab} onChange={handleTabChange} />
      )}
    </div>
  );
}
