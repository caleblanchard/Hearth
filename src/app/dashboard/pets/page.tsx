import PetsList from './PetsList';

export default function PetsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Pet Care
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track feeding, health, and care for your family pets
        </p>
      </div>

      <PetsList />
    </div>
  );
}
