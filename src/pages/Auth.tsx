import { type FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const baseSchema = z.object({
  email: z.string().trim().email("Use a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const signupSchema = baseSchema.extend({
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters."),
});

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = baseSchema.safeParse({ email, password });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid credentials input.");
      return;
    }

    setSubmitting(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Welcome back.");
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = signupSchema.safeParse({ email, password, displayName });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid sign-up input.");
      return;
    }

    setSubmitting(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.displayName);
    setSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Account created. Check your inbox to confirm your email.");
  };

  return (
    <main className="deck-bg min-h-screen py-10">
      <div className="container grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hero-panel relative overflow-hidden rounded-3xl p-8 text-primary-foreground md:p-10">
          <div className="signature-orb" aria-hidden="true" />
          <div className="relative z-10 space-y-5">
            <p className="meta-chip max-w-max bg-primary-foreground/12 text-primary-foreground">Fake News Detection Platform</p>
            <h1 className="max-w-xl text-4xl font-bold leading-tight md:text-5xl">Sign in to analyze claims, track confidence, and build trusted news intelligence.</h1>
            <p className="max-w-xl text-lg text-primary-foreground/85">
              This workspace saves every analysis in your private dashboard and supports role-based access for secure collaboration.
            </p>
            <Button variant="secondary" asChild>
              <Link to="/">Back to project overview</Link>
            </Button>
          </div>
        </section>

        <Card className="glass-panel border-border/80">
          <CardHeader>
            <CardTitle>Account access</CardTitle>
            <CardDescription>Use your email and password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signin" | "signup")}>
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form className="space-y-3" onSubmit={handleSignIn}>
                  <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <Button className="w-full" type="submit" disabled={submitting || loading}>
                    {submitting ? <Loader2 className="animate-spin" /> : <LogIn />} Continue
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form className="space-y-3" onSubmit={handleSignUp}>
                  <Input
                    type="text"
                    placeholder="Display name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                  <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <Button className="w-full" type="submit" disabled={submitting || loading}>
                    {submitting ? <Loader2 className="animate-spin" /> : <UserPlus />} Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Auth;
