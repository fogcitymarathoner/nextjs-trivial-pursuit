import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: '.env.local' });

const Home = () => {
  return (
    <>
      <h1 className="text-5xl font-bold text-blue-600">
        If this is blue and big, Tailwind is working!
      </h1>
    </>
  );
};

export default Home;