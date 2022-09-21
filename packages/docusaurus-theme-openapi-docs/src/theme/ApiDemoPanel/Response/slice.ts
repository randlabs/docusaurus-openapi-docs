/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface State {
  value?: string;
  status?: number | undefined;
}

const initialState: State = {} as any;

export const slice = createSlice({
  name: "response",
  initialState,
  reducers: {
    setResponse: (
      state,
      action: PayloadAction<[number | undefined, string]>
    ) => {
      state.status = action.payload[0];
      state.value = action.payload[1];
    },
    clearResponse: (state) => {
      state.status = undefined;
      state.value = undefined;
    },
  },
});

export const { setResponse, clearResponse } = slice.actions;

export default slice.reducer;
