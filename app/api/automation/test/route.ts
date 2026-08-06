/**
 * API endpoint to test automation validation
 * GET /api/automation/test
 */

import { NextRequest, NextResponse } from "next/server";
import { loadPlaywright } from "@/services/apply/browser-adapter";
import { wrapPlaywrightPage } from "@/services/apply/browser-adapter";
import { buildRegistry } from "@/services/apply/adapters";
import { CoreAutomationEngine } from "@/services/apply/engine/core-engine";

export async function GET(request: NextRequest) {
  try {
    const results: Record<string, any> = {};

    // Test 1: Basic Playwright Connection
    try {
      const playwright = await loadPlaywright();
      const browser = await playwright.chromium.launch({ headless: true });
      const rawPage = await browser.newPage() as any;
      const page = await wrapPlaywrightPage(rawPage);
      
      await page.goto("https://example.com");
      const title = await page.title();
      
      await browser.close();
      
      results.playwright = {
        status: "✅ Working",
        pageTitle: title,
      };
    } catch (error) {
      results.playwright = {
        status: "❌ Not Working",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Test 2: Adapter Detection
    try {
      const playwright = await loadPlaywright();
      const browser = await playwright.chromium.launch({ headless: true });
      const rawPage = await browser.newPage() as any;
      const page = await wrapPlaywrightPage(rawPage);
      
      const registry = buildRegistry();
      const detected = await registry.detect(page);
      
      await browser.close();
      
      results.adapterDetection = {
        status: "✅ Working",
        detectedAdapter: detected?.id || "none",
      };
    } catch (error) {
      results.adapterDetection = {
        status: "❌ Not Working",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Test 3: Engine Initialization
    try {
      const registry = buildRegistry();
      const engine = new CoreAutomationEngine({ registry });
      
      results.engineInit = {
        status: "✅ Working",
        adapterCount: registry.getAdapters().length,
        adapterList: registry.getAdapters().map(a => a.id),
      };
    } catch (error) {
      results.engineInit = {
        status: "❌ Not Working",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    return NextResponse.json({ 
      success: true, 
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status: 500 }
    );
  }
}
