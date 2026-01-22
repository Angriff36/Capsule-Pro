export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <a
                href="/cycle-counting"
                className="flex items-center px-3 text-gray-900 hover:text-gray-700"
              >
                <span className="text-xl font-bold">
                  Cycle Counting
                </span>
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/cycle-counting"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                Sessions
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-8">
        {children}
      </main>
    </div>
  );
}
