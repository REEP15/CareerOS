import { NextResponse } from "next/server";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { verifyAuthToken } from "@/lib/server-auth";
import { getDb } from "@/lib/firebase";
import type { ResumeProfile } from "@/types/resume";

export async function POST(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, tailoredResume } = body;

    if (!jobId || !tailoredResume) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    // Store tailored resume
    const tailoredRef = doc(getDb(), `users/${authResult.uid}/tailored-resumes/${jobId}`);
    await setDoc(tailoredRef, {
      jobId,
      content: tailoredResume,
      generatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      message: "Tailored resume saved successfully" 
    });

  } catch (error) {
    console.error("Tailored resume save error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to save tailored resume" 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ 
        success: false, 
        error: "Job ID is required" 
      }, { status: 400 });
    }

    // Get tailored resume
    const tailoredRef = doc(getDb(), `users/${authResult.uid}/tailored-resumes/${jobId}`);
    const snapshot = await getDoc(tailoredRef);

    if (!snapshot.exists()) {
      return NextResponse.json({ 
        success: false, 
        error: "Tailored resume not found" 
      }, { status: 404 });
    }

    const data = snapshot.data() as { jobId: string; content: ResumeProfile; generatedAt: string };

    return NextResponse.json({ 
      success: true, 
      tailoredResume: data.content,
      generatedAt: data.generatedAt 
    });

  } catch (error) {
    console.error("Tailored resume retrieval error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to retrieve tailored resume" 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ 
        success: false, 
        error: "Job ID is required" 
      }, { status: 400 });
    }

    // Delete tailored resume
    const tailoredRef = doc(getDb(), `users/${authResult.uid}/tailored-resumes/${jobId}`);
    await deleteDoc(tailoredRef);

    return NextResponse.json({ 
      success: true, 
      message: "Tailored resume deleted successfully" 
    });

  } catch (error) {
    console.error("Tailored resume deletion error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete tailored resume" 
    }, { status: 500 });
  }
}