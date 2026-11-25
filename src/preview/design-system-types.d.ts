// Minimal editor shims for design systems loaded from esm.sh at runtime.
declare module "@mui/material" {
  export const Button: any;
  export const Link: any;
  export const Stack: any;
  export const TextField: any;
  export const Typography: any;
}

declare module "@chakra-ui/react" {
  export const Button: any;
  export const ChakraProvider: any;
  export const FormControl: any;
  export const FormLabel: any;
  export const Input: any;
  export const Link: any;
  export const VStack: any;
}
