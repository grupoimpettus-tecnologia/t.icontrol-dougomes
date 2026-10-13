<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store local PDV store email overrides separately from synchronized API/CNPJ state, keyed by workspace, franchise and store; API refreshes must never overwrite edited contacts.
- Authorize store contact writes with authenticated `is_master` RPC validation and matching RLS policies; client profile flags control presentation only.
- Keep microarea role functions in a dedicated workspace/area/role record, separate from org_versions, to preserve historical charts; enforce existing workspace management permissions through RLS.
