import { NextRequest, NextResponse } from "next/server";
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
    ActionError,
} from "@solana/actions";
import {
    TOKEN_PROGRAM_ID,
    createTransferInstruction,
    AccountLayout,
  } from "@solana/spl-token";
import { connectToDatabase } from "@/app/(mongo)/db";
import userData from "@/app/(mongo)/userData";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");


export const GET = async (req: NextRequest) => {

    const { pathname } = new URL(req.url);
    const pathSegments = pathname.split("/");
    const userId = pathSegments[4];

    await connectToDatabase();

    const userDetails = await userData.findOne({ userId: userId });

    if (!userDetails) {
        return new Response("Organization not found", { status: 404 });
    }
    const payload: ActionGetResponse = {
        icon: `${process.env.BASE_URL}/logo.png`,
        title: "Pay to reveal",
        description:
            `Pay ${userDetails.price} to find the secret`,
        label: `Pay ${userDetails.price}`,
        links: {
            actions: [
                {
                    label: `Pay ${userDetails.price}`,
                    href: `/api/actions/pay/${userId}`,
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
        const orgKey = body.account;
        const userPubKey = new PublicKey(orgKey);

        const { pathname } = new URL(req.url);
        const pathSegments = pathname.split("/");
        const userId = pathSegments[4];

        await connectToDatabase();

        const userDetails = await userData.findOne({ userId: userId });

        if (!userDetails) {
            return new Response("Organization not found", { status: 404 });
        }

        let transaction;
        const tokenMintAddress = new PublicKey(
            "SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa"
          );
    
          // Fetch all token accounts for the user
          const tokenAccounts = await connection.getTokenAccountsByOwner(userPubKey, {
            programId: TOKEN_PROGRAM_ID,
          });
    
          let userTokenAccount: PublicKey | null = null;
          let userBalance = 0;
    
          // Find the associated token account for the specified mint
          for (const tokenAccountInfo of tokenAccounts.value) {
            const accountData = AccountLayout.decode(tokenAccountInfo.account.data);
            const mintPublicKey = new PublicKey(accountData.mint);
    
            if (mintPublicKey.equals(tokenMintAddress)) {
              userTokenAccount = tokenAccountInfo.pubkey;
              userBalance = Number(accountData.amount);
              break;
            }
          }
    
          if (!userTokenAccount) {
            let actionError: ActionError = { message: "You don't have a token account for SEND" };
            return new Response(JSON.stringify(actionError), {
              status: 400,
              headers: ACTIONS_CORS_HEADERS,
            });
          }
    
          // Check if the user has enough balance
          if (userBalance < parseFloat(userDetails.price)) {
            let actionError: ActionError = { message: "You don't have enough SEND for fees" };
            return new Response(JSON.stringify(actionError), {
              status: 400,
              headers: ACTIONS_CORS_HEADERS,
            });
          }
    
          // Ensure eventDetails.eventPubKey is a PublicKey
          const organizerPubkey = new PublicKey(userDetails.userPubKey);
          const organizerTokenAccounts = await connection.getTokenAccountsByOwner(organizerPubkey, {
            programId: TOKEN_PROGRAM_ID,
          });
    
          let organizerTokenAccount: PublicKey | null = null;
    
          // Find the associated token account for the specified mint
          for (const tokenAccountInfo of organizerTokenAccounts.value) {
            const accountData = AccountLayout.decode(tokenAccountInfo.account.data);
            const mintPublicKey = new PublicKey(accountData.mint);
    
            if (mintPublicKey.equals(tokenMintAddress)) {
              organizerTokenAccount = tokenAccountInfo.pubkey;
              break;
            }
          }
    
          if (!organizerTokenAccount) {
            let actionError: ActionError = { message: "Organizer does not have a token account for SEND" };
            return new Response(JSON.stringify(actionError), {
              status: 400,
              headers: ACTIONS_CORS_HEADERS,
            });
          }
    
          // Create the transaction for SEND
          transaction = new Transaction().add(
            createTransferInstruction(
              userTokenAccount, // Source account (user's token account)
              organizerTokenAccount, // Destination account (organizer's token account)
              userPubKey, // Owner of the source account
              userDetails.price * 1000000, // Number of tokens to transfer
              [],
              TOKEN_PROGRAM_ID
            )
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
                        href: `/api/actions/reveal?userId=${userId}`,
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
