"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badges";
import { Button, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ErrorDisplay, ErrorResponse } from "@/components/ui/ErrorDisplay";
import {
  getApiClientsAction,
  createApiClientAction,
  updateApiClientAction,
  deleteApiClientAction,
  regenerateApiKeyAction,
  type ApiClientData,
} from "./actions";

const clientFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (apiKey?: string, clientName?: string) => void;
  client?: ApiClientData | null;
}

function ClientFormModal({
  isOpen,
  onClose,
  onSuccess,
  client,
}: ClientFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || "",
      description: client?.description || "",
    },
  });

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    setError(null); // Clear any previous errors

    try {
      let result;
      if (client) {
        // Update existing client
        result = await updateApiClientAction({
          id: client.id,
          name: data.name,
          description: data.description || null,
          status: (client.status || 'ACTIVE') as 'ACTIVE' | 'REVOKED',
        });

        if (result.success) {
          onSuccess();
          handleClose();
        }
      } else {
        // Create new client
        result = await createApiClientAction({
          name: data.name,
          description: data.description || null,
        });

        if (result.success) {
          handleClose();

          // Show the API key for new clients
          if ("apiKey" in result.data) {
            onSuccess(result.data.apiKey, data.name);
          } else {
            onSuccess();
          }
        }
      }

      if (!result.success) {
        setError({
          success: false,
          error: `Failed to ${client ? "update" : "create"} client`,
          details: result.error,
        });
      }
    } catch (error) {
      setError({
        success: false,
        error: `Failed to ${client ? "update" : "create"} client`,
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${client ? "Edit" : "Create"} API Client`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && <ErrorDisplay error={error} variant="compact" />}
        <div>
          <Input
            label="Client Name"
            type="text"
            placeholder="My Application"
            {...register("name")}
            error={errors.name?.message}
            required
          />
        </div>

        <div>
          <Input
            label="Description (Optional)"
            type="text"
            placeholder="Description of what this client is used for..."
            {...register("description")}
            error={errors.description?.message}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {client ? "Update" : "Create"} Client
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  clientName: string;
}

function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  clientName,
}: ApiKeyModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = apiKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="API Key Generated">
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Important: Save this API key now
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  This is the only time you&apos;ll see the full API key. Copy it and
                  store it securely. If you lose it, you&apos;ll need to regenerate a
                  new one.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key for &quot;{clientName}&quot;
          </label>
          <div className="flex">
            <input
              type="text"
              value={apiKey}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono"
            />
            <button
              type="button"
              onClick={copyToClipboard}
              className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {copied ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          </div>
          {copied && (
            <p className="mt-2 text-sm text-green-600">Copied to clipboard!</p>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

interface ClientTableProps {
  clients: ApiClientData[];
  onEdit: (client: ApiClientData) => void;
  onDelete: (client: ApiClientData) => void;
  onRegenerate: (client: ApiClientData) => void;
  onClientsChange: () => void;
  showNotification: (type: "success" | "error", message: string) => void;
}

function ClientTable({
  clients,
  onEdit,
  onDelete,
  onRegenerate,
  onClientsChange,
  showNotification,
}: ClientTableProps) {
  const [deletingClients, setDeletingClients] = useState<Set<string>>(
    new Set(),
  );
  const [regeneratingClients, setRegeneratingClients] = useState<Set<string>>(
    new Set(),
  );

  const handleDelete = async (client: ApiClientData) => {
    if (
      !confirm(
        `Are you sure you want to delete "${client.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingClients((prev) => new Set([...prev, client.id]));

    try {
      const result = await deleteApiClientAction({ id: client.id });
      if (result.success) {
        onClientsChange();
      } else {
        showNotification("error", `Failed to delete client: ${result.error}`);
      }
    } catch (error) {
      showNotification(
        "error",
        `Failed to delete client: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setDeletingClients((prev) => {
        const next = new Set(prev);
        next.delete(client.id);
        return next;
      });
    }
  };

  const handleRegenerate = async (client: ApiClientData) => {
    if (
      !confirm(
        `Are you sure you want to regenerate the API key for "${client.name}"? The old key will stop working immediately.`,
      )
    ) {
      return;
    }

    setRegeneratingClients((prev) => new Set([...prev, client.id]));

    try {
      const result = await regenerateApiKeyAction({ id: client.id });
      if (result.success) {
        onRegenerate(client);
        onClientsChange();
      } else {
        showNotification(
          "error",
          `Failed to regenerate API key: ${result.error}`,
        );
      }
    } catch (error) {
      showNotification(
        "error",
        `Failed to regenerate API key: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setRegeneratingClients((prev) => {
        const next = new Set(prev);
        next.delete(client.id);
        return next;
      });
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) {
      return "Never";
    }
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getStatusColor = (status: string) => {
    return status === "ACTIVE" ? "success" : "danger";
  };

  if (clients.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            No API clients
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating your first API client.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">API Clients</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {client.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="text-sm text-gray-900 max-w-xs truncate"
                      title={client.description || ""}
                    >
                      {client.description || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusColor(client.status || 'ACTIVE')}>
                      {client.status || 'ACTIVE'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(client.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {client.lastUsedAt ? formatDate(client.lastUsedAt) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(client)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerate(client)}
                        isLoading={regeneratingClients.has(client.id)}
                        disabled={(client.status || 'ACTIVE') === "REVOKED"}
                      >
                        Regenerate Key
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(client)}
                        isLoading={deletingClients.has(client.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ClientsClient() {
  const [clients, setClients] = useState<ApiClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ApiClientData | null>(
    null,
  );
  const [newApiKey, setNewApiKey] = useState("");
  const [newClientName, setNewClientName] = useState("");

  // Toast notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getApiClientsAction();
      if (result.success) {
        setClients(result.data);
      } else {
        showNotification("error", `Failed to load clients: ${result.error}`);
      }
    } catch (error) {
      showNotification(
        "error",
        `Failed to load clients: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [notification]);

  const handleClientSuccess = (apiKey?: string, clientName?: string) => {
    loadClients();
    if (apiKey && clientName) {
      // Show the API key modal for new clients
      setNewApiKey(apiKey);
      setNewClientName(clientName);
      setShowApiKeyModal(true);
      showNotification(
        "success",
        `Client "${clientName}" created successfully`,
      );
    } else {
      showNotification(
        "success",
        `Client ${editingClient ? "updated" : "created"} successfully`,
      );
    }
  };

  const handleEdit = (client: ApiClientData) => {
    setEditingClient(client);
    setShowClientModal(true);
  };

  const handleDelete = (client: ApiClientData) => {
    // Handled in ClientTable component
  };

  const handleRegenerate = (client: ApiClientData) => {
    // This will be called after successful regeneration
    // The actual regeneration is handled in ClientTable
  };

  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setEditingClient(null);
  };

  const handleCreateClient = async () => {
    setShowClientModal(true);
    setEditingClient(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`rounded-md p-4 shadow-lg ${
              notification.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {notification.type === "success" ? (
                  <svg
                    className="h-5 w-5 text-green-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p
                  className={`text-sm font-medium ${
                    notification.type === "success"
                      ? "text-green-800"
                      : "text-red-800"
                  }`}
                >
                  {notification.message}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    onClick={() => setNotification(null)}
                    className={`inline-flex rounded-md p-1.5 ${
                      notification.type === "success"
                        ? "text-green-500 hover:bg-green-100"
                        : "text-red-500 hover:bg-red-100"
                    }`}
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              API Clients
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage API keys for accessing your privacy data
            </p>
          </div>

          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Button onClick={handleCreateClient}>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create Client
            </Button>
          </div>
        </div>

        <ClientTable
          clients={clients}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRegenerate={handleRegenerate}
          onClientsChange={loadClients}
          showNotification={showNotification}
        />

        {/* Modals */}
        <ClientFormModal
          isOpen={showClientModal}
          onClose={handleCloseClientModal}
          onSuccess={handleClientSuccess}
          client={editingClient}
        />

        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          apiKey={newApiKey}
          clientName={newClientName}
        />
      </div>
    </div>
  );
}
