export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="backdrop-blur-md bg-white/10 border border-white/30 rounded-2xl p-8 max-w-md w-full shadow-lg">
        <h2 className="text-white text-3xl font-bold mb-6 text-center">Welcome Back 👋</h2>

        <form className="flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Username or Email"
            className="px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            className="px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none"
          />
          <button
            type="submit"
            className="mt-4 bg-white/20 hover:bg-white/30 text-white font-semibold py-2 rounded-lg transition"
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
