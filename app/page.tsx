"use client";

import '@dialectlabs/blinks/index.css';

const Home = () => {

  return (
    <div className="flex flex-col items-center justify-center h-screen relative p-4">
      <header className="absolute top-4 left-4 right-4 pt-3 pr-10 pl-10 flex justify-between">
        <h1 className="text-4xl font-bold">BlinkView</h1>
        <a href="https://x.com/shivendram16053" className="text-lg text-blue-500 hover:underline">
          Follow on Twitter
        </a>
      </header>

      <main className="flex-grow flex items-center w-full justify-center">
        <div className="w-full max-w-md text-center">
          <h2 className="text-5xl font-bold mb-4 w-full">Welcome to BlinkView!</h2>
          <button
            className="bg-zinc-400 text-white px-4 py-2 rounded hover:bg-slate-600"
          >
            <a href="https://dial.to/developer?url=https%3A%2F%2Fseclink.vercel.app%2Fcreate&cluster=devnet">Create Secret Blink</a>
          </button>
        </div>
      </main>

      <footer className='h-[50px] absolute bottom-0 w-full flex items-center justify-center'>
        <p>Made by Shivendra</p>
      </footer>
    </div>
  );
};

export default Home;
