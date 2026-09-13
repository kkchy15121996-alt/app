import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Address, type AddressLabel } from "@/src/lib/api";

type AddressState = {
  addresses: Address[];
  selected: Address | null;
  isLoading: boolean;
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  select: (id: string) => void;
  add: (payload: { label: AddressLabel; street: string; landmark: string; pincode: string }) => Promise<Address>;
  remove: (id: string) => Promise<void>;
  isSaving: boolean;
};

const AddressCtx = createContext<AddressState | null>(null);

export function AddressProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [optimisticId, setOptimisticId] = useState<string | null>(null);

  const list = useQuery({ queryKey: ["addresses"], queryFn: api.addresses });

  const selectMut = useMutation({
    mutationFn: api.selectAddress,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["addresses"] });
      setOptimisticId(null);
    },
  });

  const addMut = useMutation({
    mutationFn: api.createAddress,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });

  const removeMut = useMutation({
    mutationFn: api.deleteAddress,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });

  const addresses = list.data ?? [];

  const selected = useMemo(() => {
    if (optimisticId) {
      const o = addresses.find((a) => a.id === optimisticId);
      if (o) return o;
    }
    return addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  }, [addresses, optimisticId]);

  const select = useCallback(
    (id: string) => {
      setOptimisticId(id);
      selectMut.mutate(id);
    },
    [selectMut],
  );

  const add = useCallback(
    async (payload: { label: AddressLabel; street: string; landmark: string; pincode: string }) => {
      const created = await addMut.mutateAsync(payload);
      // Newly saved address becomes the active delivery destination.
      setOptimisticId(created.id);
      selectMut.mutate(created.id);
      return created;
    },
    [addMut, selectMut],
  );

  const remove = useCallback(
    async (id: string) => {
      await removeMut.mutateAsync(id);
    },
    [removeMut],
  );

  const value: AddressState = {
    addresses,
    selected,
    isLoading: list.isLoading,
    sheetOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    select,
    add,
    remove,
    isSaving: addMut.isPending,
  };

  return <AddressCtx.Provider value={value}>{children}</AddressCtx.Provider>;
}

export function useAddress() {
  const ctx = useContext(AddressCtx);
  if (!ctx) throw new Error("useAddress must be used inside AddressProvider");
  return ctx;
}

export const ADDRESS_ICONS: Record<AddressLabel, "home" | "briefcase" | "bed" | "location"> = {
  Home: "home",
  Office: "briefcase",
  Hostel: "bed",
  Other: "location",
};
