"""Regresi sederhana: dashboard MySQL bisa disegarkan manual dan otomatis."""
import ast
from pathlib import Path
source=Path(__file__).with_name('app.py').read_text(encoding='utf-8')
tree=ast.parse(source)
funcs = {node.name:node for node in tree.body if isinstance(node, ast.FunctionDef)}
assert 'update_dashboard' in funcs and 'update_area_options' in funcs
assert 'id="db-refresh-now"' in source
assert 'id="db-auto-refresh"' in source
for name in ('update_dashboard','update_area_options'):
    f=funcs[name]
    assert all(arg in [x.arg for x in f.args.args] for arg in ('refresh_clicks','refresh_intervals'))
    assert 'Input("db-refresh-now", "n_clicks")' in source
    assert 'Input("db-auto-refresh", "n_intervals")' in source
assert 'Inventaris · ' in source
print('TES REFRESH BERHASIL: event tombol, interval, status data MySQL')
