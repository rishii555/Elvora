"use client";

import React, { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics/events";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    vertical: "retail",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    trackEvent({
      name: "demo_request",
      properties: { vertical: formData.vertical },
    });

    // Simulate safe client submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-8 text-center space-y-3">
        <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-emerald-900">Inquiry Received Successfully</h3>
        <p className="text-xs text-emerald-800/80 max-w-sm mx-auto leading-relaxed">
          Thank you for reaching out. One of our product specialists will contact you at{" "}
          <span className="font-semibold">{formData.email}</span> within 4 business hours.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({
              name: "",
              businessName: "",
              email: "",
              phone: "",
              vertical: "retail",
              message: "",
            });
          }}
          className="mt-2 text-xs font-semibold text-emerald-700 underline hover:text-emerald-800"
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-bold text-[#111827] mb-1">Your Full Name *</label>
          <input
            type="text"
            required
            placeholder="Rohan Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block font-bold text-[#111827] mb-1">Business Name *</label>
          <input
            type="text"
            required
            placeholder="Sharma Traders & Distributors"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            className="w-full rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-bold text-[#111827] mb-1">Email Address *</label>
          <input
            type="email"
            required
            placeholder="rohan@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block font-bold text-[#111827] mb-1">Contact Phone Number *</label>
          <input
            type="tel"
            required
            placeholder="+91 98765 43210"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block font-bold text-[#111827] mb-1">Primary Business Vertical</label>
        <select
          value={formData.vertical}
          onChange={(e) => setFormData({ ...formData, vertical: e.target.value })}
          className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-xs text-slate-800 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="retail">Retail Counter Store / Supermarket</option>
          <option value="wholesale">Wholesale & B2B Distribution</option>
          <option value="electronics">Electronics & Hardware</option>
          <option value="apparel">Apparel & Footwear</option>
          <option value="services">Professional Services / Consulting</option>
          <option value="other">Other Commercial Trade</option>
        </select>
      </div>

      <div>
        <label className="block font-bold text-[#111827] mb-1">How Can We Help You?</label>
        <textarea
          rows={4}
          placeholder="Tell us about your billing requirements, number of billing counters, or questions regarding migration..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#1D4ED8] disabled:opacity-50 transition-all cursor-pointer"
      >
        {isSubmitting ? "Sending..." : "Submit Inquiry"}
        <Send className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
