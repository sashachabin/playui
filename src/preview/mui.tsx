import { Button, Link, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import "./styles.css";

export default function App({ route = "/", afterSubmit = "" }) {
  const [submitted, setSubmitted] = useState(false);
  const reset = route === "/forgot-password";
  const done = route === "/done";

  return (
    <main className="page">
      <section className="card">
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
          {done
            ? "You are all set"
            : reset
              ? "Reset your password"
              : route === "/login"
                ? "Sign in"
                : "Create your account"}
        </Typography>
        {!done && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (afterSubmit) parent.postMessage({ route: afterSubmit }, "*");
              else setSubmitted(true);
            }}
          >
            <Stack spacing={2}>
              <TextField label="Work email" type="email" required fullWidth />
              {!reset && <TextField label="Password" type="password" required fullWidth />}
              <Button variant="contained" type="submit" size="large" fullWidth>
                {reset ? "Send reset link" : "Continue"}
              </Button>
            </Stack>
            {submitted && <p role="status">You are all set.</p>}
          </form>
        )}
        <footer>
          <Link href={route === "/" ? "/login" : "/"} underline="hover">
            {route === "/" ? "Sign in" : "Create account"}
          </Link>
          {route === "/login" && (
            <Link href="/forgot-password" underline="hover">
              Forgot password?
            </Link>
          )}
        </footer>
      </section>
    </main>
  );
}
