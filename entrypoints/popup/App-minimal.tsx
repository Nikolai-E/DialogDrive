import React from 'react';
import './App.css';

function App() {
  console.log('Minimal App component loading...');
  
  return (
    <div className="w-96 h-[580px] bg-white border-2 border-red-500 flex flex-col">
      <div className="p-4 bg-blue-500 text-white">
        <h1 className="text-lg font-bold">DialogDrive</h1>
        <p className="text-sm">Extension is working!</p>
      </div>
      
      <div className="flex-1 p-4">
        <p className="text-gray-700">This is a test to see if the extension loads properly.</p>
        
        <div className="mt-4 space-y-2">
          <button className="w-full px-4 py-2 bg-green-500 text-white rounded">
            Test Button 1
          </button>
          <button className="w-full px-4 py-2 bg-blue-500 text-white rounded">
            Test Button 2
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <h3 className="font-medium mb-2">Debug Info:</h3>
          <p className="text-sm text-gray-600">
            Current time: {new Date().toLocaleTimeString()}
          </p>
          <p className="text-sm text-gray-600">
            Extension status: ✅ Loaded successfully
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
