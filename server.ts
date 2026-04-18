import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { GoogleGenAI } from "@google/genai";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Stripe: Create Payment Intent
  app.post("/api/payment/create-intent", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    try {
      const { amount, quoteId, customerName } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Stripe expects cents/smallest unit
        currency: "vnd",
        metadata: { quoteId, customerName },
        automatic_payment_methods: { enabled: true },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Resend: Send Notification
  app.post("/api/notifications/send", async (req, res) => {
    if (!resend) {
      return res.status(500).json({ error: "Resend is not configured" });
    }

    try {
      const { subject, html, to } = req.body;
      
      const { data, error } = await resend.emails.send({
        from: process.env.NOTIFICATION_EMAIL_FROM || "onboarding@resend.dev",
        to: to || process.env.NOTIFICATION_EMAIL_TO || "anhovan.cmo@gmail.com",
        subject,
        html,
      });

      if (error) {
        return res.status(400).json({ error });
      }

      res.json({ data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Gemini: Generate Product Image
  app.post("/api/ai/generate-image", async (req, res) => {
    if (!genAI) {
      return res.status(500).json({ error: "Gemini is not configured" });
    }

    try {
      const { name, description } = req.body;
      
      // Using the modern SDK pattern: ai.models.generateContent
      // Select gemini-2.5-flash-image for image generation as per skill
      const response = await (genAI as any).models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [{
          parts: [{
            text: `High-quality professional product photo of ${name}. ${description}. Elegant studio lighting, minimalist background.`
          }]
        }],
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let base64Image = "";
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
          }
        }
      }

      if (base64Image) {
        res.json({ image: `data:image/png;base64,${base64Image}` });
      } else {
        res.status(500).json({ error: "No image was generated" });
      }
    } catch (error: any) {
      console.error("Gemini Image Gen Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Vite / Production Serving ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
