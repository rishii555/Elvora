import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Elvora — Professional Responsive Login & Signup UI Redesign", () => {
  const loginPath = path.join(__dirname, "../app/(auth)/login/page.tsx");
  const registerPath = path.join(__dirname, "../app/(auth)/register/page.tsx");
  const forgotPath = path.join(__dirname, "../app/(auth)/forgot-password/page.tsx");
  const resetPath = path.join(__dirname, "../app/(auth)/reset-password/page.tsx");
  const layoutPath = path.join(__dirname, "../components/auth/auth-layout.tsx");
  const passwordInputPath = path.join(__dirname, "../components/auth/auth-password-input.tsx");
  const testCardPath = path.join(__dirname, "../components/auth/admin-test-card.tsx");

  it("1. Reusable AuthLayout provides consistent branding, top nav, subtle background and footer", () => {
    expect(fs.existsSync(layoutPath)).toBe(true);
    const layoutContent = fs.readFileSync(layoutPath, "utf-8");

    // Exact homepage header layout alignment structure & container
    expect(layoutContent).toContain("flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8");
    expect(layoutContent).toContain('<ElvoraLogo showTagline size="md" />');

    // Brand elements
    expect(layoutContent).toContain("ElvoraLogo");
    expect(layoutContent).toContain("bg-slate-50");

    // Geometric desktop background decor
    expect(layoutContent).toContain("hidden md:block");
    expect(layoutContent).toContain("stroke-slate-200");

    // Navigation and links matching homepage right-side alignment
    expect(layoutContent).toContain("Create Account");
    expect(layoutContent).toContain("Already registered?");
    expect(layoutContent).toContain("Sign In");
    expect(layoutContent).toContain("Terms of Service");
    expect(layoutContent).toContain("Privacy Policy");
  });

  it("2. Login page implements desktop & mobile specifications with show/hide password and Auto Fill", () => {
    expect(fs.existsSync(loginPath)).toBe(true);
    const loginContent = fs.readFileSync(loginPath, "utf-8");

    // Headings and content
    expect(loginContent).toContain("Welcome Back");
    expect(loginContent).toContain("AuthTabs");
    expect(loginContent).toContain("AuthInput");
    expect(loginContent).toContain("AuthPasswordInput");
    expect(loginContent).toContain("Remember me");
    expect(loginContent).toContain("Forgot password?");

    // Development auto fill preserved
    expect(loginContent).toContain("AdminTestCard");

    // API contract and flow preserved
    expect(loginContent).toContain("/api/auth/login");
    expect(loginContent).toContain("/dashboard");
    expect(loginContent).toContain("/pending-approval");
  });

  it("3. Password field provides accessible show/hide toggle", () => {
    expect(fs.existsSync(passwordInputPath)).toBe(true);
    const passContent = fs.readFileSync(passwordInputPath, "utf-8");

    expect(passContent).toContain("showPassword");
    expect(passContent).toContain("setShowPassword");
    expect(passContent).toContain("Eye");
    expect(passContent).toContain("EyeOff");
    expect(passContent).toContain("aria-label");
  });

  it("4. Admin test card protects production and auto fills credentials in dev", () => {
    expect(fs.existsSync(testCardPath)).toBe(true);
    const cardContent = fs.readFileSync(testCardPath, "utf-8");

    // Safe environment guard
    expect(cardContent).toContain('process.env.NODE_ENV !== "development"');
    expect(cardContent).toContain("admin@elvora.com");
    expect(cardContent).toContain("admin123");
    expect(cardContent).toContain("Auto Fill");
  });

  it("5. Register page preserves all business fields, terms, and clean layout", () => {
    expect(fs.existsSync(registerPath)).toBe(true);
    const registerContent = fs.readFileSync(registerPath, "utf-8");

    expect(registerContent).toContain("Create Business Workspace");
    expect(registerContent).toContain("tradeName");
    expect(registerContent).toContain("businessSector");
    expect(registerContent).toContain("stateCode");
    expect(registerContent).toContain("gstin");
    expect(registerContent).toContain("address");
    expect(registerContent).toContain("name");
    expect(registerContent).toContain("phone");
    expect(registerContent).toContain("email");
    expect(registerContent).toContain("password");
    expect(registerContent).toContain("agreeTerms");
    expect(registerContent).toContain("/api/auth/register");
    expect(registerContent).toContain("/pending-approval");
  });

  it("6. Forgot Password and Reset Password share the unified design language", () => {
    expect(fs.existsSync(forgotPath)).toBe(true);
    expect(fs.existsSync(resetPath)).toBe(true);

    const forgotContent = fs.readFileSync(forgotPath, "utf-8");
    const resetContent = fs.readFileSync(resetPath, "utf-8");

    expect(forgotContent).toContain("AuthLayout");
    expect(forgotContent).toContain("Reset Your Password");
    expect(forgotContent).toContain("/api/auth/forgot-password");

    expect(resetContent).toContain("AuthLayout");
    expect(resetContent).toContain("Set New Password");
    expect(resetContent).toContain("/api/auth/reset-password");
  });
});
