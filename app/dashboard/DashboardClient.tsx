"use client";

import { useState, useEffect, useOptimistic, useTransition, useCallback } from "react";
import { ConsentPolicyTable } from "@/components/consent/ConsentPolicyTable";
import { PolicyFormModal } from "@/components/consent/PolicyFormModal";
import { TokenIssueModal } from "@/components/consent/TokenIssueModal";
import { TokenRevokeModal } from "@/components/consent/TokenRevokeModal";
import { AuditLogsModal } from "@/components/consent/AuditLogsModal";
import { HealthDataCard } from "@/components/consent/HealthDataCard";
import { Button } from "@/components/ui/form";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import type { ErrorResponse } from "@/lib/http";
import {
  getPoliciesJsonAction,
  getCategoriesJsonAction,
  loadDemoDataJsonAction,
} from "./actions";

interface ConsentPolicy {
  id: string;
  purpose: string;
  scopes: string[];
  status: "GRANTED" | "RESTRICTED" | "REVOKED";
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: {
    key: string;
    name: string;
  };
}

interface DataCategory {
  id: string;
  key: string;
  name: string;
  description: string;
}

export default function DashboardClient() {
  const [policies, setPolicies] = useState<ConsentPolicy[]>([]);
  const [categories, setCategories] = useState<DataCategory[]>([]);
  const [optimisticPolicies, addOptimisticPolicy] = useOptimistic(
    policies,
    (state: ConsentPolicy[], newPolicy: ConsentPolicy) => [...state, newPolicy],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showTokenIssueModal, setShowTokenIssueModal] = useState(false);
  const [showTokenRevokeModal, setShowTokenRevokeModal] = useState(false);
  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ConsentPolicy | null>(
    null,
  );

  // Toast notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Persistent errors for user-friendly display
  const [persistentError, setPersistentError] = useState<ErrorResponse | null>(
    null,
  );

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setPersistentError(null); // Clear previous errors

    try {
      const [policiesResult, categoriesResult] = await Promise.all([
        getPoliciesJsonAction(),
        getCategoriesJsonAction(),
      ]);

      if (policiesResult.success) {
        setPolicies(policiesResult.data);
      } else {
        // Show persistent error for policy loading failures
        setPersistentError({
          success: false,
          error: policiesResult.error,
          reason:
            "Failed to load your consent policies. This might be due to a temporary connection issue or you may not have access to view policies.",
        });
        return; // Don't continue if policies fail to load
      }

      if (categoriesResult.success) {
        // Add default description for categories that don't have one
        const categoriesWithDescription = categoriesResult.data.map((cat) => ({
          id: cat.id,
          key: cat.key,
          name: cat.name,
          description: `${cat.name} information`, // Add default description
        }));
        setCategories(categoriesWithDescription);
      } else {
        showNotification(
          "error",
          `Failed to load categories: ${categoriesResult.error}`,
        );
      }
    } catch (error) {
      setPersistentError({
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        reason:
          "Failed to load dashboard data. Please check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [notification]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const handlePolicySuccess = () => {
    loadInitialData();
    showNotification(
      "success",
      `Policy ${editingPolicy ? "updated" : "created"} successfully`,
    );
  };

  const handleTokenIssueSuccess = (token: string) => {
    showNotification("success", "Token issued successfully");
    // Could show token in a dialog here
  };

  const handleTokenRevokeSuccess = () => {
    showNotification("success", "Token revoked successfully");
  };

  const handleEdit = (policy: ConsentPolicy) => {
    setEditingPolicy(policy);
    setShowPolicyModal(true);
  };

  const handleClosePolicyModal = () => {
    setShowPolicyModal(false);
    setEditingPolicy(null);
  };

  const loadDemoData = async () => {
    const confirmed = confirm(
      "This will create sample data for demonstration purposes. Continue?",
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await loadDemoDataJsonAction();
        if (result.success) {
          await loadInitialData();
          showNotification("success", "Demo data loaded successfully");
        } else {
          showNotification(
            "error",
            `Failed to load demo data: ${result.error}`,
          );
        }
      } catch (error) {
        showNotification(
          "error",
          `Failed to load demo data: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    });
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
        {/* Persistent Error Display */}
        {persistentError && (
          <div className="mb-6">
            <ErrorDisplay
              error={persistentError}
              showDetails={false}
              className="max-w-4xl"
            />
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPersistentError(null);
                  loadInitialData();
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Privacy Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage consent policies, tokens, and audit compliance
            </p>
          </div>

          <div className="mt-4 flex md:mt-0 md:ml-4">
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowAuditLogsModal(true)}
              >
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Audit Logs
              </Button>

              <Button
                variant="outline"
                onClick={loadDemoData}
                isLoading={isPending}
                disabled={isPending}
              >
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
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                Load Demo Data
              </Button>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div
            onClick={() => setShowPolicyModal(true)}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-blue-600"
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
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Create Policy
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      New Consent
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div
            onClick={() => setShowTokenIssueModal(true)}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Issue Token
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      Generate JWT
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div
            onClick={() => setShowTokenRevokeModal(true)}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Revoke Token
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      Invalidate JWT
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Policies
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {optimisticPolicies.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Data Demo Card */}
        <div className="mb-8">
          <HealthDataCard />
        </div>

        {/* Consent Policies Table */}
        <ConsentPolicyTable
          policies={optimisticPolicies}
          onEdit={handleEdit}
          onPoliciesChange={loadInitialData}
        />

        {/* Modals */}
        <PolicyFormModal
          isOpen={showPolicyModal}
          onClose={handleClosePolicyModal}
          onSuccess={handlePolicySuccess}
          policy={editingPolicy}
          categories={categories}
        />

        <TokenIssueModal
          isOpen={showTokenIssueModal}
          onClose={() => setShowTokenIssueModal(false)}
          onSuccess={handleTokenIssueSuccess}
          categories={categories}
        />

        <TokenRevokeModal
          isOpen={showTokenRevokeModal}
          onClose={() => setShowTokenRevokeModal(false)}
          onSuccess={handleTokenRevokeSuccess}
        />

        <AuditLogsModal
          isOpen={showAuditLogsModal}
          onClose={() => setShowAuditLogsModal(false)}
        />
      </div>
    </div>
  );
}
