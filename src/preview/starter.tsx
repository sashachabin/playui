import { Button, Input } from "@skbkontur/react-ui";
import { useState } from "react";
import "./styles.css";

export default function App({ route = "/", afterSubmit = "" }) {
  const [submitted, setSubmitted] = useState(false);
  const reset = route === "/forgot-password";
  const done = route === "/done";

  return (
    <main className="page">
      <section className="card">
        <h1>
          {done
            ? "You are all set"
            : reset
              ? "Reset your password"
              : route === "/login"
                ? "Sign in"
                : "Create your account"}
        </h1>
        {!done && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (afterSubmit) parent.postMessage({ route: afterSubmit }, "*");
              else setSubmitted(true);
            }}
          >
            <label htmlFor="email">Work email</label>
            <Input id="email" type="email" placeholder="you@company.com" required width="100%" />
            {!reset && (
              <>
                <label htmlFor="password">Password</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  width="100%"
                />
              </>
            )}
            <Button use="accent" type="submit" width="100%">
              {reset ? "Send reset link" : "Continue"}
            </Button>
            {submitted && <p role="status">You are all set.</p>}
          </form>
        )}
        <footer>
          <a href={route === "/" ? "/login" : "/"}>
            {route === "/" ? "Sign in" : "Create account"}
          </a>
          {route === "/login" && <a href="/forgot-password">Forgot password?</a>}
        </footer>
      </section>
    </main>
  );
}
