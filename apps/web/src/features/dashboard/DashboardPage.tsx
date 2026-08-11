import { CreateLinkForm } from "../links/CreateLinkForm";
import { LinksList } from "../links/LinksList";

export function DashboardPage() {
  return (
    <div className="page container">
      <div className="page__header">
        <div>
          <h1 className="page__title">Links</h1>
          <div className="page__subtitle">create and monitor short links</div>
        </div>
      </div>

      <CreateLinkForm />
      <div style={{ height: 20 }} />
      <LinksList />
    </div>
  );
}
