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
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

// ---------------------------------------------------------------------------
// Login Screen
// ---------------------------------------------------------------------------
function LoginScreen() {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.22 0.04 260 / 0.6) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shadow-glow">
              <Zap
                className="w-8 h-8 text-primary-foreground"
                strokeWidth={2.5}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-energy-pv border-2 border-background flex items-center justify-center">
              <Sun className="w-3 h-3 text-background" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <Card className="bg-card border-border shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-display text-2xl text-foreground">
              PV &amp; E-Car Analytics
            </CardTitle>
            <CardDescription className="font-mono text-sm text-muted-foreground leading-relaxed mt-2">
              Melde dich mit deiner Internet Identity an, um deine Energiedaten
              sicher zu verwalten.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Security badge */}
            <div className="flex items-center gap-2.5 p-3 rounded-md bg-secondary/60 border border-border">
              <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-xs font-mono text-muted-foreground">
                Deine Daten sind verschlüsselt und ausschliesslich deiner
                Internet Identity zugeordnet.
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
                  Anmeldung läuft…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Mit Internet Identity anmelden
                </>
              )}
            </Button>

            <p className="text-center text-xs font-mono text-muted-foreground">
              Noch keine Internet Identity?{" "}
              <a
                href="https://identity.ic0.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Jetzt erstellen
              </a>
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs font-mono text-muted-foreground">
        © {new Date().getFullYear()}. Erstellt mit{" "}
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pvName.trim();
    if (!trimmed) {
      toast.error("Bitte gib einen Namen für deine PV-Anlage ein.");
      return;
    }
    if (!actor) {
      toast.error("Verbindung zum Backend nicht verfügbar.");
      return;
    }

    try {
      setIsSubmitting(true);
      await actor.registerUser(trimmed);
      toast.success("Registrierung erfolgreich!");
      onRegistered();
    } catch (err) {
      console.error("Registration failed:", err);
      toast.error("Registrierung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.22 0.04 260 / 0.6) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shadow-glow">
              <Zap
                className="w-8 h-8 text-primary-foreground"
                strokeWidth={2.5}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-energy-pv border-2 border-background flex items-center justify-center">
              <Sun className="w-3 h-3 text-background" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <Card className="bg-card border-border shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl text-foreground">
              Willkommen! Richte dein Konto ein.
            </CardTitle>
            <CardDescription className="font-mono text-sm text-muted-foreground mt-1">
              Gib deiner PV-Anlage einen Namen, damit deine Daten klar
              zugeordnet werden können.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="pv-name"
                  className="text-sm font-mono text-foreground"
                >
                  Name der PV-Anlage
                </Label>
                <Input
                  id="pv-name"
                  data-ocid="register.input"
                  type="text"
                  placeholder="z.B. Dachanlage Süd"
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
                    Wird gespeichert…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Registrieren
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs font-mono text-muted-foreground">
        © {new Date().getFullYear()}. Erstellt mit{" "}
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
  );
}

// ---------------------------------------------------------------------------
// Loading Screen
// ---------------------------------------------------------------------------
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
      <p className="text-sm font-mono text-muted-foreground">Wird geladen…</p>
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

  const handleLogout = () => {
    clear();
    queryClient.clear();
  };

  return (
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
                    LIVE
                  </span>
                </div>

                <Button
                  data-ocid="header.logout_button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 px-2.5 text-muted-foreground hover:text-foreground font-mono text-xs gap-1.5"
                  title="Abmelden"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Abmelden</span>
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
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="upload"
                  data-ocid="upload.tab"
                  className="flex items-center gap-2 text-sm font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Daten hochladen
                </TabsTrigger>
                <TabsTrigger
                  value="tarife"
                  data-ocid="tarife.tab"
                  className="flex items-center gap-2 text-sm font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Tarife
                </TabsTrigger>
                <TabsTrigger
                  value="vergleich"
                  data-ocid="vergleich.tab"
                  className="flex items-center gap-2 text-sm font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <GitCompareArrows className="w-3.5 h-3.5" />
                  Vergleich
                </TabsTrigger>
                <TabsTrigger
                  value="einstellungen"
                  data-ocid="settings.tab"
                  className="flex items-center gap-2 text-sm font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Einstellungen
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="mt-0">
                <Dashboard />
              </TabsContent>

              <TabsContent value="upload" className="mt-0">
                <DataUpload onDataUploaded={() => setActiveTab("dashboard")} />
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
                Built with love using{" "}
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

  // Sync local input when context value changes externally
  const handleSave = async () => {
    const parsed = Number.parseFloat(localValue);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 2) {
      toast.error(
        "Ungültiger CO₂-Faktor. Bitte einen Wert zwischen 0 und 2 eingeben.",
      );
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
          CO₂-Faktor
        </CardTitle>
        <CardDescription className="font-mono text-xs text-muted-foreground">
          Gramm CO₂ pro verbrauchter kWh (Strommix). Standardwert für Schweizer
          Strommix: 0.128 kg/kWh.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label
              htmlFor="co2-faktor"
              className="text-xs font-mono text-muted-foreground mb-1.5 block"
            >
              kg CO₂/kWh
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
                  Speichern…
                </>
              ) : (
                "Speichern"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPanel({ userProfile }: SettingsPanelProps) {
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
            Profil
          </CardTitle>
          <CardDescription className="font-mono text-xs text-muted-foreground">
            Deine Kontoinformationen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              PV-Anlage
            </span>
            <span className="text-sm font-mono text-foreground font-medium">
              {userProfile.pvName}
            </span>
          </div>
          <div className="flex items-start justify-between py-2">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Principal
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
            Anzeigewährung
          </CardTitle>
          <CardDescription className="font-mono text-xs text-muted-foreground">
            Wähle die Währung für alle Kosten- und Ertragsanzeigen.
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
export default function App() {
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
