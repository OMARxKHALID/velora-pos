import { useSearchParams } from "next/navigation"

const NO_PARAMS = new URLSearchParams()

export const useUrlState = (key, fallback, allowed) => {
  const params = useSearchParams() ?? NO_PARAMS
  const asked = params.get(key)
  const value = asked !== null && (!allowed || allowed.includes(asked)) ? asked : fallback

  const setValue = (next) => {
    const search = new URLSearchParams(window.location.search)
    next === fallback ? search.delete(key) : search.set(key, next)
    const query = search.toString()
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname)
  }

  return [value, setValue]
}
