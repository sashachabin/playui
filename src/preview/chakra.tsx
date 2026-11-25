import {
  Button,
  ChakraProvider,
  FormControl,
  FormLabel,
  Input,
  Link,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import "./styles.css";

export default function App({ route = "/", afterSubmit = "" }) {
  const [submitted, setSubmitted] = useState(false);
  const reset = route === "/forgot-password";
  const done = route === "/done";

  return (
    <ChakraProvider>
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
              <VStack align="stretch" spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Work email</FormLabel>
                  <Input type="email" placeholder="you@company.com" />
                </FormControl>
                {!reset && (
                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <Input type="password" placeholder="At least 8 characters" />
                  </FormControl>
                )}
                <Button colorScheme="blue" size="lg" type="submit">
                  {reset ? "Send reset link" : "Continue"}
                </Button>
              </VStack>
              {submitted && <p role="status">You are all set.</p>}
            </form>
          )}
          <footer>
            <Link href={route === "/" ? "/login" : "/"}>
              {route === "/" ? "Sign in" : "Create account"}
            </Link>
            {route === "/login" && <Link href="/forgot-password">Forgot password?</Link>}
          </footer>
        </section>
      </main>
    </ChakraProvider>
  );
}
