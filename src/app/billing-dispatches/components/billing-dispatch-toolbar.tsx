'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AGREEMENT_BILLING_EMAIL_DISPATCH_STATUS_OPTIONS,
  agreementBillingEmailDispatchStatusLabels,
} from '@/schemas/agreement';
import type { Agreement } from '@/schemas/agreement';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Mail, RefreshCw } from 'lucide-react';
import * as React from 'react';

interface ToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  agreements: Agreement[];
  selectedAgreementId: string;
  onAgreementChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onRunBillingEmails?: () => void;
  isRunningBillingEmails?: boolean;
}

export function BillingDispatchToolbar({
  searchValue,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
  agreements,
  selectedAgreementId,
  onAgreementChange,
  selectedStatus,
  onStatusChange,
  onRunBillingEmails,
  isRunningBillingEmails = false,
}: ToolbarProps) {
  const canRun = useHasPermission('agreements:run');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por período..."
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className="md:max-w-[180px]"
          />
          <Select value={selectedAgreementId} onValueChange={onAgreementChange}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Todos los convenios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los convenios</SelectItem>
              {agreements.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.agreementCode} — {a.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los estados</SelectItem>
              {AGREEMENT_BILLING_EMAIL_DISPATCH_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {agreementBillingEmailDispatchStatusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-9"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          )}

          {onRunBillingEmails && canRun && (
            <Button
              type="button"
              size="sm"
              onClick={onRunBillingEmails}
              disabled={isRunningBillingEmails}
              className="h-9"
            >
              <Mail className={`mr-2 h-4 w-4 ${isRunningBillingEmails ? 'animate-pulse' : ''}`} />
              Encolar correos
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
