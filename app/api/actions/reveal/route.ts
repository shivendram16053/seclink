import { connectToDatabase } from "@/app/(mongo)/db";
import userData from "@/app/(mongo)/userData";
import {
  NextActionPostRequest,
  ActionError,
  CompletedAction,
  ACTIONS_CORS_HEADERS,
} from "@solana/actions";
import { clusterApiUrl, Connection } from "@solana/web3.js";
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export const GET = async () => {
  return Response.json(
    { message: "Method not supported" },
    {
      headers: ACTIONS_CORS_HEADERS,
    }
  );
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  await connectToDatabase();
  try {
    const body: NextActionPostRequest = await req.json();
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") ?? "";
    const userDetails = await userData.findOne({ userId: userId });
    
    let signature: string;
    try {
      signature = body.signature;
      if (!signature) throw "Invalid signature";
    } catch (err) {
      throw (err);
    }

    try {
      const status = await connection.getSignatureStatus(signature);

      if (!status) throw "Unknown signature status";

      if (status.value?.confirmationStatus) {
        if (
          status.value.confirmationStatus != "confirmed" &&
          status.value.confirmationStatus != "finalized"
        ) {
          const actionError: ActionError = {
            message: "Signature not confirmed or finalized",
          };
          return new Response(JSON.stringify(actionError), {
            status: 400,
            headers: ACTIONS_CORS_HEADERS,
          });
        }
      }

      const payload: CompletedAction = {
        type: "completed",
        title: userDetails.secret,
        icon: `${userDetails.image}`,
        label: "Do not take Screenshot",
        description: `No screenshots allowed`,
      };

      return new Response(JSON.stringify(payload), {
        headers: ACTIONS_CORS_HEADERS,
      });
    } catch (err) {
      console.error("Error in transaction or saving event:", err);
      if (typeof err == "string") throw err;
      throw "Unable to confirm the provided signature";
    }
  } catch (err) {
    console.error("General error:", err);
    const actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return new Response(JSON.stringify(actionError), {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};
