import GenerationHistory from "@/components/GenerationHistory";

export default function HistoryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Generation History</h1>
        <a 
          href="/api/test-generations"
          className="btn btn-outline btn-sm"
          target="_blank"
          rel="noopener noreferrer"
        >
          Generate Test Data
        </a>
      </div>
      <GenerationHistory />
    </div>
  );
} 