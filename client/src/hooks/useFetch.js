import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export const useFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shouldFetch, setShouldFetch] = useState(options.autoFetch !== false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios({
        method: options.method || "GET",
        url,
        data: options.body,
        headers: options.headers,
        params: options.params,
        withCredentials: true,
      });

      setData(response.data);

      if (options.onSuccess) {
        options.onSuccess(response.data);
      }
    } catch (err) {
      setError(err.response?.data || err.message || "An error occurred");

      if (options.onError) {
        options.onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  // Function to trigger a refetch
  const refetch = useCallback(() => {
    setShouldFetch(true);
  }, []);

  useEffect(() => {
    if (shouldFetch) {
      fetchData();
      setShouldFetch(false);
    }
  }, [shouldFetch, fetchData]);

  return { data, loading, error, refetch };
};

export default useFetch;
