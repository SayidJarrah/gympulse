import { create } from 'zustand'
import type { AxiosError } from 'axios'
import type { UserMembership, MembershipStatus } from '../types/userMembership'
import type { ApiErrorResponse } from '../types/auth'
import {
  getMyMembership,
  purchaseMembership as purchaseMembershipApi,
  cancelMyMembership as cancelMyMembershipApi,
  getAdminMemberships,
  adminCancelMembership as adminCancelMembershipApi,
} from '../api/memberships'
import { getMembershipErrorMessage } from '../utils/membershipErrors'

interface MembershipState {
  // Current user's active membership (null = no active membership or not yet fetched)
  activeMembership: UserMembership | null;
  membershipLoading: boolean;
  membershipError: string | null;
  // Tracks the raw backend error code for the membership fetch
  membershipErrorCode: string | null;

  // Admin slice
  adminMemberships: UserMembership[];
  adminMembershipsTotalPages: number;
  adminMembershipsPage: number;
  adminMembershipsTotalElements: number;
  adminMembershipsLoading: boolean;
  adminMembershipsError: string | null;

  // User actions
  fetchMyMembership: () => Promise<void>;
  purchaseMembership: (planId: string) => Promise<void>;
  cancelMyMembership: () => Promise<void>;

  // Admin actions
  fetchAdminMemberships: (
    status?: MembershipStatus,
    userId?: string,
    page?: number,
    size?: number
  ) => Promise<void>;
  adminCancelMembership: (membershipId: string) => Promise<void>;

  // Utility
  setMembershipError: (message: string | null) => void;
}

let pendingMembershipRequest: Promise<void> | null = null
let latestAdminMembershipsRequestId = 0

export const useMembershipStore = create<MembershipState>((set, get) => ({
  // User slice initial state
  activeMembership: null,
  membershipLoading: false,
  membershipError: null,
  membershipErrorCode: null,

  // Admin slice initial state
  adminMemberships: [],
  adminMembershipsTotalPages: 0,
  adminMembershipsPage: 0,
  adminMembershipsTotalElements: 0,
  adminMembershipsLoading: false,
  adminMembershipsError: null,

  fetchMyMembership: async () => {
    if (pendingMembershipRequest) {
      return pendingMembershipRequest
    }

    pendingMembershipRequest = (async () => {
      set({ membershipLoading: true, membershipError: null, membershipErrorCode: null })
      try {
        const data = await getMyMembership()
        set({ activeMembership: data, membershipLoading: false })
      } catch (err) {
        const axiosError = err as AxiosError<ApiErrorResponse>
        const code = axiosError.response?.data?.code ?? ''
        if (code === 'NO_ACTIVE_MEMBERSHIP') {
          // Not an error — user simply has no membership yet
          set({
            activeMembership: null,
            membershipLoading: false,
            membershipErrorCode: 'NO_ACTIVE_MEMBERSHIP',
            membershipError: null,
          })
        } else {
          const message = getMembershipErrorMessage(code, 'Failed to load your membership.')
          set({
            membershipLoading: false,
            membershipError: message,
            membershipErrorCode: code,
          })
        }
      } finally {
        pendingMembershipRequest = null
      }
    })()

    return pendingMembershipRequest
  },

  purchaseMembership: async (planId: string) => {
    // Called from PurchaseConfirmModal — modal owns its own loading/error state.
    // This action throws on failure so the modal can catch and display the error.
    const data = await purchaseMembershipApi({ planId })
    set({ activeMembership: data })
  },

  cancelMyMembership: async () => {
    // Called from CancelMembershipModal — modal owns its own loading/error state.
    // Throws on failure so the modal can catch and display the error.
    await cancelMyMembershipApi()
    // After cancellation, re-fetch so membershipErrorCode becomes NO_ACTIVE_MEMBERSHIP
    await get().fetchMyMembership()
  },

  fetchAdminMemberships: async (
    status?: MembershipStatus,
    userId?: string,
    page = 0,
    size = 20
  ) => {
    const requestId = ++latestAdminMembershipsRequestId
    set({ adminMembershipsLoading: true, adminMembershipsError: null })
    try {
      const data = await getAdminMemberships(status, userId, page, size)
      if (requestId !== latestAdminMembershipsRequestId) {
        return
      }
      set({
        adminMemberships: data.content,
        adminMembershipsTotalPages: data.totalPages,
        adminMembershipsPage: data.number,
        adminMembershipsTotalElements: data.totalElements,
        adminMembershipsLoading: false,
      })
    } catch (err) {
      if (requestId !== latestAdminMembershipsRequestId) {
        return
      }
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      const message = getMembershipErrorMessage(code, 'Failed to load memberships.')
      set({ adminMembershipsLoading: false, adminMembershipsError: message })
    }
  },

  adminCancelMembership: async (membershipId: string) => {
    // Called from AdminCancelMembershipModal — modal owns its own loading/error state.
    // Throws on failure so the modal can catch and display the error.
    const updated = await adminCancelMembershipApi(membershipId)
    set((state) => ({
      adminMemberships: state.adminMemberships.map((m) =>
        m.id === updated.id ? updated : m
      ),
    }))
  },

  setMembershipError: (message: string | null) =>
    set({ membershipError: message }),
}))
