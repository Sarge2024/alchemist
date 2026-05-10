# Firestore Schema: Lounge Gastronômico (v2.1.0)

## Collection: `lounge_messages`

| Field | Type | Description |
| :--- | :--- | :--- |
| `text` | `string` | O conteúdo da mensagem (Markdown suportado). |
| `senderId` | `string` | UID do Firebase Auth do remetente. |
| `senderRole` | `string` | Papel do remetente no momento do envio (`user`, `collaborator`, `admin`). |
| `timestamp` | `timestamp` | Marcador de tempo do servidor (`serverTimestamp`). |
| `status` | `string` | Estado de moderação: `pending` ou `approved`. |
| `reactions` | `map` | Mapa de UIDs para booleanos: `{ "uid123": true }`. |
| `metadata` | `map` | Dados extras: `{ "cultureLink": "url", "context": "description" }`. |

---

## Security Rules Implementation (Snippet)

```javascript
    // --- Lounge Gastronômico (v2.1.0) ---
    match /lounge_messages/{messageId} {
      allow read: if isSignedIn();
      
      // Apenas colaboradores ou superiores podem criar mensagens
      allow create: if isVerified() && (
        hasRole('collaborator') || 
        hasRole('colaborador') || 
        isAdmin()
      );
      
      allow update: if isVerified() && (
        // Administradores e Moderadores podem tudo
        isAdmin() || hasRole('moderator') ||
        
        // Qualquer usuário logado pode alternar sua própria reação
        (
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reactions'])
        )
      );

      // Apenas Admin ou o próprio autor pode deletar (se pendente)
      allow delete: if isAdmin() || (
        isOwner(resource.data.senderId) && resource.data.status == 'pending'
      );
    }
```
