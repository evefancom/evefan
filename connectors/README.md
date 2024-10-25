```dataview
TABLE WITHOUT ID
	link(file.path, replace(replace(file.path, "/README.md", ""), "connectorss/connectors-", "")
	) as connectors, 
	status as Status
FROM "connectorss"
WHERE file.path != "connectorss/README.md"
```



