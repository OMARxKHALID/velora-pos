export const createAccount = async (auth, { id, password, ...fields }) => {
  const ctx = await auth.$context
  await ctx.internalAdapter.createUser({ id, ...fields })
  await ctx.internalAdapter.linkAccount({ userId: id, providerId: "credential", accountId: id, password: await ctx.password.hash(password) })
}
