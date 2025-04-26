import SpriteGenerator from '@/components/SpriteGenerator';

export default function GenerateSpritePage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Generate Sprite</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create a pixel-art character with multiple animations
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <SpriteGenerator />
        </div>
      </div>
    </div>
  );
} 