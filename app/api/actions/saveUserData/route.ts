import { connectToDatabase } from "@/app/(mongo)/db";
import userData from "@/app/(mongo)/userData";
import {
  createActionHeaders,
  NextActionPostRequest,
  ActionError,
  CompletedAction,
  ACTIONS_CORS_HEADERS,
} from "@solana/actions";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { customAlphabet } from "nanoid";
const generateRandomId = customAlphabet(`${process.env.SECRET_KEY}`, 15);
const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

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
    const secret = url.searchParams.get("secret") ?? "";
    const price = url.searchParams.get("price")??"";
    const image = url.searchParams.get("image")??""
    const userPubKey = url.searchParams.get("pubkey")??""
    
    let signature: string;
    try {
      signature = body.signature;
      if (!signature) throw "Invalid signature";
    } catch (err) {
      throw 'Invalid "signature" provided';
    }

    try {
      let status = await connection.getSignatureStatus(signature);

      if (!status) throw "Unknown signature status";

      if (status.value?.confirmationStatus) {
        if (
          status.value.confirmationStatus != "confirmed" &&
          status.value.confirmationStatus != "finalized"
        ) {
          let actionError: ActionError = {
            message: "Signature not confirmed or finalized",
          };
          return new Response(JSON.stringify(actionError), {
            status: 400,
            headers: ACTIONS_CORS_HEADERS,
          });
        }
      }
      const userId = generateRandomId();


      const newUserData = new userData({
        userId,
        secret,
        image,
        userPubKey,
        price
      });

      await newUserData.save();

      const transaction = await connection.getParsedTransaction(
        signature,
        "confirmed"
      );

      const blinkUrl = `${process.env.BASE_URL}/pay/${userId}`;
      const twitterShareUrl = `https://twitter.com/intent/tweet?text=Check%20out%20my%20secret:%20${encodeURIComponent(
        blinkUrl
      )}`;

      // Generate the QR code URL for the Twitter share link
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
        twitterShareUrl
      )}`;

      const payload: CompletedAction = {
        type: "completed",
        title: "Blink Created",
        icon: qrCodeUrl,
        label: "Share on twitter now",
        description: `Your Blink URL to share is 
        ${blinkUrl}
        or just scan the QR code to share.`,
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
    let actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return new Response(JSON.stringify(actionError), {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};