import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Car,
  GitCompareArrows,
  Leaf,
  Loader2,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  Sun,
  Upload,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "./backend.d.ts";
import CurrencySelector from "./components/CurrencySelector";
import Dashboard from "./components/Dashboard";
import DataUpload from "./components/DataUpload";
import JahresVergleich from "./components/JahresVergleich";
import TarifVerwaltung from "./components/TarifVerwaltung";
import { Co2Provider, useCo2 } from "./contexts/Co2Context";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { DataModeProvider } from "./contexts/DataModeContext";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

// ---------------------------------------------------------------------------
// Language Switcher
// ---------------------------------------------------------------------------
function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      data-ocid="header.language_toggle"
    >
      <button
        type="button"
        onClick={() => setLang("de")}
        className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
          lang === "de"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        DE
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
          lang === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login Screen
// ---------------------------------------------------------------------------
function LoginScreen() {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();
  const { t } = useLanguage();

  const features = [
    {
      icon: Sun,
      title: t("heroFeature1Title"),
      desc: t("heroFeature1Desc"),
    },
    {
      icon: Car,
      title: t("heroFeature2Title"),
      desc: t("heroFeature2Desc"),
    },
    {
      icon: ShieldCheck,
      title: t("heroFeature3Title"),
      desc: t("heroFeature3Desc"),
    },
  ];

  return (
    <div className="min-h-screen relative flex flex-col lg:flex-row">
      {/* Full-screen background image */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src="/assets/generated/startseite-hero.dim_1600x900.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      </div>
      {/* Bright light overlay */}
      <div className="fixed inset-0 z-0 bg-white/60" />

      {/* Language switcher */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Left hero column */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-8 py-16 lg:px-16 lg:py-24 lg:w-3/5">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                <Zap
                  className="w-7 h-7 text-primary-foreground"
                  strokeWidth={2.5}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-energy-pv border-2 border-white flex items-center justify-center">
                <Sun className="w-3 h-3 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <span className="font-display text-xl font-bold text-gray-900">
              PV & E-Car Analytics
            </span>
          </div>

          {/* Tagline */}
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
            {t("heroTagline")}
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed mb-12 max-w-lg">
            {t("heroSubtitle")}
          </p>

          {/* Features */}
          <div className="space-y-5">
            {features.map((f) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,

                  ease: "easeOut",
                }}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {f.title}
                  </p>
                  <p className="text-gray-600 text-sm mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right login column */}
      <div className="relative z-10 flex flex-col justify-center items-center px-8 py-12 lg:w-2/5 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <Card className="bg-white/90 backdrop-blur-sm border-border shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="font-display text-2xl text-foreground">
                {t("loginTitle")}
              </CardTitle>
              <CardDescription className="font-mono text-sm text-muted-foreground leading-relaxed mt-2">
                {t("loginDescription")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex items-center gap-2.5 p-3 rounded-md bg-secondary/60 border border-border">
                <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-xs font-mono text-muted-foreground">
                  {t("loginSecurity")}
                </p>
              </div>

              <Button
                data-ocid="login.primary_button"
                onClick={login}
                disabled={isLoggingIn || isInitializing}
                className="w-full bg-primary text-primary-foreground hover:opacity-90 font-mono shadow-glow h-11 text-sm"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("loginLoggingIn")}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    {t("loginButton")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <p className="text-center mt-6 text-xs font-mono text-gray-500">
            © {new Date().getFullYear()}. {t("footerBuiltWith")}{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registration Screen
// ---------------------------------------------------------------------------
interface RegistrationScreenProps {
  onRegistered: () => void;
}

function RegistrationScreen({ onRegistered }: RegistrationScreenProps) {
  const { actor } = useActor();
  const [pvName, setPvName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pvName.trim();
    if (!trimmed) {
      toast.error(t("registerErrorName"));
      return;
    }
    if (!actor) {
      toast.error(t("registerErrorNoActor"));
      return;
    }

    try {
      setIsSubmitting(true);
      await actor.registerUser(trimmed);
      toast.success(t("registerSuccess"));
      onRegistered();
    } catch (err) {
      console.error("Registration failed:", err);
      toast.error(t("registerError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      {/* Full-screen background image */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src="/assets/generated/startseite-hero.dim_1600x900.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      </div>
      <div className="fixed inset-0 z-0 bg-white/65" />

      {/* Language switcher */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <Zap
                className="w-8 h-8 text-primary-foreground"
                strokeWidth={2.5}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-energy-pv border-2 border-white flex items-center justify-center">
              <Sun className="w-3 h-3 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <Card className="bg-white/90 backdrop-blur-sm border-border shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl text-foreground">
              {t("registerTitle")}
            </CardTitle>
            <CardDescription className="font-mono text-sm text-muted-foreground mt-1">
              {t("registerDescription")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="pv-name"
                  className="text-sm font-mono text-foreground"
                >
                  {t("registerPvLabel")}
                </Label>
                <Input
                  id="pv-name"
                  data-ocid="register.input"
                  type="text"
                  placeholder={t("registerPvPlaceholder")}
                  value={pvName}
                  onChange={(e) => setPvName(e.target.value)}
                  required
                  autoFocus
                  className="bg-secondary border-border font-mono text-sm h-11 focus-visible:ring-primary"
                />
              </div>

              <Button
                data-ocid="register.submit_button"
                type="submit"
                disabled={isSubmitting || !pvName.trim()}
                className="w-full bg-primary text-primary-foreground hover:opacity-90 font-mono shadow-glow h-11"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("registerSaving")}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {t("registerButton")}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center mt-6 text-xs font-mono text-gray-500">
          © {new Date().getFullYear()}. {t("footerBuiltWith")}{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Screen
// ---------------------------------------------------------------------------
function LoadingScreen() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
      <p className="text-sm font-mono text-muted-foreground">{t("loading")}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App (authenticated + registered)
// ---------------------------------------------------------------------------
interface MainAppProps {
  userProfile: UserProfile;
}

function MainApp({ userProfile }: MainAppProps) {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const { t } = useLanguage();

  const handleLogout = () => {
    clear();
    queryClient.clear();
  };

  return (
    <DataModeProvider>
      <CurrencyProvider>
        <Co2Provider initialCo2Faktor={userProfile.co2Faktor}>
          <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
              <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center shadow-glow">
                    <Zap
                      className="w-4 h-4 text-primary-foreground"
                      strokeWidth={2.5}
                    />
                  </div>
                  <div>
                    <h1 className="font-display text-base font-semibold tracking-tight text-foreground leading-none">
                      PV & E-Car Analytics
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate max-w-[180px] sm:max-w-none">
                      {userProfile.pvName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-secondary border border-border">
                    <div className="w-1.5 h-1.5 rounded-full bg-energy-pv animate-pulse-glow" />
                    <span className="text-xs font-mono text-muted-foreground">
                      {t("live")}
                    </span>
                  </div>

                  <LanguageSwitcher />

                  <Button
                    data-ocid="header.logout_button"
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="h-8 px-2.5 text-muted-foreground hover:text-foreground font-mono text-xs gap-1.5"
                    title={t("logout")}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t("logout")}</span>
                  </Button>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-4 py-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 bg-secondary border border-border h-10 p-1 flex-wrap gap-1">
                  <TabsTrigger
                    value="dashboard"
                    data-ocid="nav.tab"
                    className="flex items-center gap-2 text-sm font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    {t("tabDashboard")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="upload"
                    data-ocid="upload.tab"
                    className="flex items-center gap-2 text-sm font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {t("tabUpload")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="tarife"
                    data-ocid="tarife.tab"
                    className="flex items-center gap-2 text-sm font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    {t("tabTarife")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="vergleich"
                    data-ocid="vergleich.tab"
                    className="flex items-center gap-2 text-sm font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <GitCompareArrows className="w-3.5 h-3.5" />
                    {t("tabVergleich")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="einstellungen"
                    data-ocid="settings.tab"
                    className="flex items-center gap-2 text-sm font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    {t("tabEinstellungen")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-0">
                  <Dashboard />
                </TabsContent>

                <TabsContent value="upload" className="mt-0">
                  <DataUpload
                    onDataUploaded={() => setActiveTab("dashboard")}
                  />
                </TabsContent>

                <TabsContent value="tarife" className="mt-0">
                  <TarifVerwaltung />
                </TabsContent>

                <TabsContent value="vergleich" className="mt-0">
                  <JahresVergleich />
                </TabsContent>

                <TabsContent value="einstellungen" className="mt-0">
                  <SettingsPanel userProfile={userProfile} />
                </TabsContent>
              </Tabs>
            </main>

            {/* Footer */}
            <footer className="border-t border-border py-4">
              <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-xs font-mono text-muted-foreground">
                  © {new Date().getFullYear()} PV & E-Car Analytics
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  {t("footerBuiltWith")}{" "}
                  <a
                    href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    caffeine.ai
                  </a>
                </p>
              </div>
            </footer>
          </div>
        </Co2Provider>
      </CurrencyProvider>
    </DataModeProvider>
  );
}

// ---------------------------------------------------------------------------
// Settings Panel
// ---------------------------------------------------------------------------
interface SettingsPanelProps {
  userProfile: UserProfile;
}

function Co2SettingsCard() {
  const { co2Faktor, setCo2Faktor, saveCo2Faktor, isUpdating } = useCo2();
  const [localValue, setLocalValue] = useState<string>(co2Faktor.toFixed(3));
  const { t } = useLanguage();

  const handleSave = async () => {
    const parsed = Number.parseFloat(localValue);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 2) {
      toast.error(t("settingsCo2Invalid"));
      return;
    }
    setCo2Faktor(parsed);
    await saveCo2Faktor(parsed);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
          <Leaf className="w-4 h-4 text-energy-pv" />
          {t("settingsCo2Title")}
        </CardTitle>
        <CardDescription className="font-mono text-xs text-muted-foreground">
          {t("settingsCo2Description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label
              htmlFor="co2-faktor"
              className="text-xs font-mono text-muted-foreground mb-1.5 block"
            >
              {t("settingsCo2Label")}
            </Label>
            <Input
              id="co2-faktor"
              data-ocid="settings.co2faktor.input"
              type="number"
              step={0.001}
              min={0}
              max={2}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="bg-secondary border-border font-mono text-sm h-10 focus-visible:ring-primary"
            />
          </div>
          <div className="pt-6">
            <Button
              data-ocid="settings.co2faktor.save_button"
              onClick={() => void handleSave()}
              disabled={isUpdating}
              size="sm"
              className="bg-primary text-primary-foreground hover:opacity-90 font-mono h-10"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("save")
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPanel({ userProfile }: SettingsPanelProps) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-ocid="settings.panel"
      className="max-w-lg space-y-6"
    >
      {/* Profile info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base text-foreground">
            {t("settingsProfile")}
          </CardTitle>
          <CardDescription className="font-mono text-xs text-muted-foreground">
            {t("settingsProfileDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              {t("settingsPvAnlage")}
            </span>
            <span className="text-sm font-mono text-foreground font-medium">
              {userProfile.pvName}
            </span>
          </div>
          <div className="flex items-start justify-between py-2">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              {t("settingsPrincipal")}
            </span>
            <span className="text-xs font-mono text-muted-foreground text-right break-all max-w-[220px]">
              {userProfile.principal.toString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base text-foreground">
            {t("settingsCurrency")}
          </CardTitle>
          <CardDescription className="font-mono text-xs text-muted-foreground">
            {t("settingsCurrencyDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurrencySelector />
        </CardContent>
      </Card>

      {/* CO2 Factor */}
      <Co2SettingsCard />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Root App — Auth Gate
// ---------------------------------------------------------------------------
function AppInner() {
  const { identity, isInitializing, loginStatus } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  const profileQuery = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching && isAuthenticated,
    retry: false,
  });

  const isLoading =
    isInitializing ||
    loginStatus === "logging-in" ||
    actorFetching ||
    (isAuthenticated && profileQuery.isLoading);

  const isFetched = !!actor && profileQuery.isFetched;

  const userProfile = profileQuery.data ?? null;

  const showRegistration =
    isAuthenticated && !isLoading && isFetched && userProfile === null;
  const showApp =
    isAuthenticated && !isLoading && isFetched && userProfile !== null;

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LoadingScreen />
          </motion.div>
        ) : !isAuthenticated ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LoginScreen />
          </motion.div>
        ) : showRegistration ? (
          <motion.div
            key="register"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RegistrationScreen
              onRegistered={() => {
                void profileQuery.refetch();
              }}
            />
          </motion.div>
        ) : showApp && userProfile ? (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MainApp userProfile={userProfile} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Toaster
        theme="dark"
        toastOptions={{
          classNames: {
            toast: "bg-card border-border text-foreground font-mono text-sm",
          },
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}
