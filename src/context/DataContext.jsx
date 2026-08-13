import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, usersRes, configRes] = await Promise.all([
        api.getJobs(),
        api.getUsers(),
        api.getConfig(),
      ]);
      setJobs(jobsRes.jobs);
      setUsers(usersRes.users);
      setConfig(configRes.config);
      if (user?.role === 'admin') {
        const requestsRes = await api.getRequests();
        setRequests(requestsRes.requests);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Fetch jobs/users/config as soon as we know who's logged in.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-login
    if (user) refresh();
  }, [user, refresh]);

  const createJob = useCallback(async (payload) => {
    const { job } = await api.createJob(payload);
    setJobs((prev) => [...prev, job]);
    return job;
  }, []);

  const updateJob = useCallback(async (id, payload) => {
    const { job } = await api.updateJob(id, payload);
    setJobs((prev) => prev.map((j) => (j.id === id ? job : j)));
    return job;
  }, []);

  const deleteJob = useCallback(async (id) => {
    await api.deleteJob(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const bumpFeedback = useCallback(async (id, delta) => {
    const { job } = await api.feedback(id, delta);
    setJobs((prev) => prev.map((j) => (j.id === id ? job : j)));
    return job;
  }, []);

  const reassignJob = useCallback(async (id, designerId) => {
    const { job } = await api.reassign(id, designerId);
    setJobs((prev) => prev.map((j) => (j.id === id ? job : j)));
    return job;
  }, []);

  const createUser = useCallback(async (payload) => {
    const { user: newUser } = await api.createUser(payload);
    setUsers((prev) => [...prev, newUser]);
    return newUser;
  }, []);

  const updateUser = useCallback(async (id, payload) => {
    const { user: updated } = await api.updateUser(id, payload);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    return updated;
  }, []);

  const deleteUser = useCallback(async (id) => {
    await api.deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const addListItem = useCallback(async (listName, value) => {
    const { config } = await api.addListItem(listName, value);
    setConfig(config);
  }, []);

  const removeListItem = useCallback(async (listName, value) => {
    const { config } = await api.removeListItem(listName, value);
    setConfig(config);
  }, []);

  const createChangeRequest = useCallback(async (jobId, field, requestedValue) => {
    const { request } = await api.createChangeRequest(jobId, field, requestedValue);
    return request;
  }, []);

  const resolveChangeRequest = useCallback(async (id, status) => {
    const { request } = await api.resolveRequest(id, status);
    setRequests((prev) => prev.map((r) => (r.id === id ? request : r)));
    if (status === 'approved') {
      const { jobs } = await api.getJobs();
      setJobs(jobs);
    }
    return request;
  }, []);

  return (
    <DataContext.Provider
      value={{
        jobs,
        users,
        config,
        requests,
        loading,
        error,
        refresh,
        createJob,
        updateJob,
        deleteJob,
        bumpFeedback,
        reassignJob,
        createUser,
        updateUser,
        deleteUser,
        addListItem,
        removeListItem,
        createChangeRequest,
        resolveChangeRequest,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives with its provider on purpose
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
