/**
 * Selector functions for trade data from the Redux store
 */

import { createSelector } from "@reduxjs/toolkit";

// Basic selectors
export const selectTradesState = (state) => state.trades || {};
export const selectActiveTradesData = (state) =>
  state.trades?.activeTradesData || {};
export const selectTradeHistoryData = (state) =>
  state.trades?.tradeHistoryData || {};

// Derived selectors
export const selectActiveTradesLoading = (state) =>
  selectActiveTradesData(state).loading;
export const selectTradeHistoryLoading = (state) =>
  selectTradeHistoryData(state).loading;

export const selectActiveTradesError = (state) =>
  selectActiveTradesData(state).error;
export const selectTradeHistoryError = (state) =>
  selectTradeHistoryData(state).error;

// Memoized selectors
export const selectFilteredActiveTrades = createSelector(
  [selectActiveTradesData, (_, filters) => filters],
  (activeTrades, filters) => {
    if (!activeTrades?.trades || !activeTrades.trades.length) return [];

    let filtered = [...activeTrades.trades];

    // Apply status filter
    if (filters?.status) {
      filtered = filtered.filter((trade) => trade.status === filters.status);
    }

    // Apply role filter
    if (filters?.role) {
      const userId = filters.userId;
      if (filters.role === "buyer") {
        filtered = filtered.filter((trade) => trade.buyer?._id === userId);
      } else if (filters.role === "seller") {
        filtered = filtered.filter((trade) => trade.seller?._id === userId);
      }
    }

    // Apply search filter
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((trade) => {
        // Search by trade ID
        if (trade._id?.toLowerCase().includes(search)) return true;
        if (trade.tradeId?.toLowerCase().includes(search)) return true;

        // Search by item name
        if (trade.item?.name?.toLowerCase().includes(search)) return true;

        // Search by username
        if (trade.seller?.username?.toLowerCase().includes(search)) return true;
        if (trade.buyer?.username?.toLowerCase().includes(search)) return true;

        return false;
      });
    }

    // Apply sort
    if (filters?.sort) {
      switch (filters.sort) {
        case "oldest":
          filtered.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
          break;
        case "price-high":
          filtered.sort(
            (a, b) =>
              parseFloat(b.item?.price || 0) - parseFloat(a.item?.price || 0)
          );
          break;
        case "price-low":
          filtered.sort(
            (a, b) =>
              parseFloat(a.item?.price || 0) - parseFloat(b.item?.price || 0)
          );
          break;
        case "newest":
        default:
          filtered.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
      }
    }

    return filtered;
  }
);

export const selectFilteredTradeHistory = createSelector(
  [selectTradeHistoryData, (_, filters) => filters],
  (tradeHistory, filters) => {
    if (!tradeHistory?.trades || !tradeHistory.trades.length) return [];

    let filtered = [...tradeHistory.trades];

    // Apply status filter
    if (filters?.status) {
      filtered = filtered.filter((trade) => trade.status === filters.status);
    }

    // Apply role filter
    if (filters?.role) {
      const userId = filters.userId;
      if (filters.role === "buyer") {
        filtered = filtered.filter((trade) => trade.buyer?._id === userId);
      } else if (filters.role === "seller") {
        filtered = filtered.filter((trade) => trade.seller?._id === userId);
      }
    }

    // Apply search filter
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((trade) => {
        // Search by trade ID
        if (trade._id?.toLowerCase().includes(search)) return true;
        if (trade.tradeId?.toLowerCase().includes(search)) return true;

        // Search by item name
        if (trade.item?.name?.toLowerCase().includes(search)) return true;

        // Search by username
        if (trade.seller?.username?.toLowerCase().includes(search)) return true;
        if (trade.buyer?.username?.toLowerCase().includes(search)) return true;

        return false;
      });
    }

    // Apply sort
    if (filters?.sort) {
      switch (filters.sort) {
        case "oldest":
          filtered.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
          break;
        case "price-high":
          filtered.sort(
            (a, b) =>
              parseFloat(b.item?.price || 0) - parseFloat(a.item?.price || 0)
          );
          break;
        case "price-low":
          filtered.sort(
            (a, b) =>
              parseFloat(a.item?.price || 0) - parseFloat(b.item?.price || 0)
          );
          break;
        case "newest":
        default:
          filtered.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
      }
    }

    return filtered;
  }
);

export default {
  selectActiveTradesData,
  selectTradeHistoryData,
  selectFilteredActiveTrades,
  selectFilteredTradeHistory,
};
