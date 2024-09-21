import { NextRequest } from "next/server";
import {
  Transaction,
  PublicKey,
  SystemProgram,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  ActionGetResponse,
} from "@solana/actions";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const MY_PUB_KEY = `${process.env.PUBLIC_KEY}`;


export const GET = async () => {
  const payload : ActionGetResponse ={
    icon: `${process.env.BASE_URL}/logo.png`,
    title: "Create your blink secret",
    description:
      "Enter the secret to share with others and get paid",
    label: "Create One",
    links: {
      actions: [
        {
          label: "Create One",
          href: `/api/actions/create?secret={secret}&image={image}&price={price}`,
          parameters: [
            { type: "text", name: "secret", label: "Enter Secret", required: true },
            {
              type: "url",
              name: "image",
              label: "Enter Image URL",
              required:true
            },
            {
              type: "number",
              name: "price",
              label: "Enter Price in SEND",
              required: true,
            },
          ],
        },
      ],
    },
    type: "action",
  };

  return new Response(JSON.stringify(payload), {
    headers: ACTIONS_CORS_HEADERS,
  });
};

export const OPTIONS = GET;

export const POST = async (req: NextRequest) => {
  try {

    const body = (await req.json()) as { account: string; signature: string };

    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret") ?? "";
    const image = searchParams.get("image") ?? "";
    const price = searchParams.get("price") ?? "0";
    const orgKey = body.account;
    const userPubKey = new PublicKey(orgKey);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userPubKey,
        toPubkey: new PublicKey(MY_PUB_KEY),
        lamports: 0.003 * LAMPORTS_PER_SOL, 
      })
    );

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const payload = await createPostResponse({
      fields: {
        transaction,
        message: "",
        links: {
          next: {
            type: "post",
            href: `/api/actions/saveUserData?secret=${secret}&price=${price}&image=${image}&pubkey=${userPubKey}`,
          },
        },
      },
    });

    return new Response(JSON.stringify(payload), {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (error) {
    console.error("Error processing POST request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: ACTIONS_CORS_HEADERS,
      }
    );
  }
};
