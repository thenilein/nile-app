import React from 'react';
import { User } from 'lucide-react';

type ProfileCompletionFormProps = {
  phone: string;
  fullName: string;
  loading: boolean;
  onNameChange: (value: string) => void;
  onSubmit: () => Promise<void> | void;
  onBack?: () => void;
  title?: string;
  description?: string;
  submitLabel?: string;
};

const ProfileCompletionForm: React.FC<ProfileCompletionFormProps> = ({
  phone,
  fullName,
  loading,
  onNameChange,
  onSubmit,
  onBack,
  title = 'Complete your profile',
  description = 'Enter your name to finish setting up your account.',
  submitLabel = 'Continue',
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">{title}</h2>
        <p className="text-sm text-gray-500">
          {description}
          <br />
          <span className="font-semibold text-gray-700">+91 {phone}</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Your name</label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-1 focus-within:ring-green-800 focus-within:border-green-800">
          <div className="flex items-center justify-center px-3 bg-gray-50 border-r border-gray-200 text-gray-400">
            <User className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={fullName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter your full name"
            className="block w-full px-3 py-3 border-0 focus:ring-0 outline-none"
            autoFocus
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !fullName.trim()}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back
        </button>
      )}
    </form>
  );
};

export default ProfileCompletionForm;
