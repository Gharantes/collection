import { useEffect, useState } from "react";
import { addItem, deleteItem, listItems, type Item } from "./db";
import "./App.css";

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Roda a ação, recarrega a lista e mostra erro na tela.
  const run = (action: () => Promise<unknown>) => async () => {
    setError(null);
    try {
      await action();
      setItems(await listItems());
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    run(async () => {})();
  }, []);

  const onAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;
    run(async () => {
      await addItem(name);
      form.reset();
    })();
  };

  return (
    <main className="container">
      <h1>Collection</h1>

      <form className="row" onSubmit={onAdd}>
        <input name="name" placeholder="Nome" required />
        <button type="submit">Adicionar</button>
      </form>

      {error && <p style={{ color: "tomato" }}>{error}</p>}

      {items.length === 0 ? (
        <p>Nenhum item ainda.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.name} <button onClick={run(() => deleteItem(item.id))}>Remover</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default App;
