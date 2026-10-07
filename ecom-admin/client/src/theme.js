import { createTheme } from '@mantine/core';

const brand = [
  '#FBF6E6',
  '#F6ECC4',
  '#F0DC8F',
  '#EACC5A',
  '#E7BE3A',
  '#E4B028',
  '#C99820',
  '#A67B18',
  '#7F5D14',
  '#5C4410',
];

export const lightTheme = createTheme({
  primaryColor: 'brand',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  defaultRadius: 'md',
  headings: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  colors: {
    brand,
  },
});

export const darkTheme = createTheme({
  ...lightTheme,
  primaryColor: 'brand',
});
