package com.chance.teststh;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.chance.teststh.PinnedList;
import com.chance.teststh.TestAdapter;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.BaseAdapter;
import android.widget.Gallery;
import android.widget.ImageView;
import android.widget.ListView;
import android.widget.SimpleAdapter;
import android.widget.TextView;

public class MainActivity extends Activity {
	
	private TestAdapter adapter;
	private PinnedList listView;

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_main);
		adapter = new TestAdapter(this,getLayoutInflater());
		listView = (PinnedList) this.findViewById(R.id.section_list_view);
		listView.addHeaderView(LayoutInflater.from(this).inflate(
				R.layout.list_header_myprofile, null));
		listView.setAdapter(adapter);  
		listView.setOnScrollListener(adapter);
		listView.setPinnedHeaderView(getLayoutInflater().inflate(
				R.layout.list_log_section, listView, false));
	}  

	


}

