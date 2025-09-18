import React, { useState } from 'react';
import { X, Hash, Lock } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import toast from 'react-hot-toast';

interface CreateChannelModalProps {
  onClose: () => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ onClose }) => {
  const { currentWorkspace, createChannel, setCurrentChannel } = useWorkspaceStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Channel name is required');
      return;
    }

    if (!currentWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    setIsLoading(true);
    try {
      const channel = await createChannel(currentWorkspace.id, {
        name: formData.name.toLowerCase().replace(/\s+/g, '-'),
        displayName: formData.name,
        description: formData.description,
        type: formData.isPrivate ? 'private' : 'public',
      });
      
      toast.success(`Channel #${channel.name} created!`);
      setCurrentChannel(channel);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create channel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create a channel</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Channel Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {formData.isPrivate ? (
                    <Lock className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Hash className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slack-purple focus:border-slack-purple"
                  placeholder="e.g. marketing"
                  maxLength={80}
                  autoFocus
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Names must be lowercase, without spaces or periods, and can't be longer than 80 characters.
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slack-purple focus:border-slack-purple"
                placeholder="What's this channel about?"
                rows={3}
              />
            </div>

            {/* Privacy Toggle */}
            <div>
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                  className="mt-0.5 h-4 w-4 text-slack-purple focus:ring-slack-purple border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Make private</span>
                  <p className="text-xs text-gray-500">
                    {formData.isPrivate 
                      ? "Only specific people can view and join this channel"
                      : "Anyone in your workspace can view and join this channel"}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slack-green text-white rounded-md hover:bg-slack-green/90 disabled:opacity-50"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
