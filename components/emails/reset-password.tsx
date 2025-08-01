import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text
} from "@react-email/components";

interface ResetPasswordEmailProps {
  url: string;
  userEmail: string;
}

export const ResetPasswordEmail = ({
  url,
  userEmail
}: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your uprio password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reset your password</Heading>
          <Text
            style={{
              ...text,
              color: "#ababab",
              marginTop: "14px",
              marginBottom: "16px"
            }}
          >
            We have received a request to reset the password for your Uprio
            account associated with {userEmail}.
          </Text>
          <Link
            href={url}
            target="_blank"
            style={{
              ...link,
              display: "block",
              marginBottom: "16px"
            }}
          >
            Click here to reset your password
          </Link>
          <Text
            style={{
              ...text,
              color: "#ababab",
              marginTop: "14px",
              marginBottom: "16px"
            }}
          >
            This link will expire in 15 minutes.
          </Text>
          <Text style={footer}>AI invoicing</Text>
        </Container>
      </Body>
    </Html>
  );
};

export const main = {
  backgroundColor: "#ffffff"
};

export const container = {
  paddingLeft: "12px",
  paddingRight: "12px",
  margin: "0 auto"
};

export const h1 = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0"
};

export const link = {
  color: "#2754C5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  textDecoration: "underline"
};

export const text = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  margin: "24px 0"
};

export const footer = {
  color: "#898989",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "12px",
  lineHeight: "22px",
  marginTop: "12px",
  marginBottom: "24px"
};

export const code = {
  display: "inline-block",
  padding: "16px 4.5%",
  width: "90.5%",
  backgroundColor: "#f4f4f4",
  borderRadius: "5px",
  border: "1px solid #eee",
  color: "#333"
};
